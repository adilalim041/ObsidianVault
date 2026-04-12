# MCP Toolbox (Google) — Backend Analysis

> Score: 8.2 | Repo: googleapis/mcp-toolbox | Date: 2026-04-12
> Stack: Go, chi router, pgxpool, fsnotify, OpenTelemetry, JWT (keyfunc)

## Overview

MCP Toolbox — production-grade MCP server written in Go, exposing databases (Postgres, Spanner, BigQuery, MySQL, MongoDB, Redis, 30+ more) as MCP tools over HTTP/SSE or stdio. Config-driven: tools are defined in YAML, no code changes needed to add new tool.

---

## Pattern 1: init()-based Plugin Registry

**File:** `internal/tools/tools.go`, `internal/sources/sources.go`

Both `tools` and `sources` packages expose a global `Register(type, factory)` function. Each database driver (e.g. `internal/sources/postgres/postgres.go`) calls `sources.Register("postgres", newConfig)` in its `init()` function. The server imports all drivers via a side-effect import in `cmd/internal`:

```go
// internal/tools/tools.go
var toolRegistry = make(map[string]ToolConfigFactory)

func Register(resourceType string, factory ToolConfigFactory) bool {
    if _, exists := toolRegistry[resourceType]; exists {
        return false
    }
    toolRegistry[resourceType] = factory
    return true
}

// internal/sources/postgres/postgres.go
func init() {
    if !sources.Register(SourceType, newConfig) {
        panic(fmt.Sprintf("source type %q already registered", SourceType))
    }
}
```

**Why it matters:** Zero central switch-case for 30+ databases. Adding a new DB = new package + `init()`. The panic-on-collision prevents silent shadowing. This exact pattern works for any extensible plugin system in Go (formatters, validators, connectors).

---

## Pattern 2: Two-Level Tool Parameter System (templateParameters + parameters)

**File:** `internal/tools/postgres/postgressql/postgressql.go`, `internal/util/parameters/parameters.go`

Each tool config has two parameter lists:
- `parameters` — standard SQL positional params, bound as `$1, $2...` via pgx
- `templateParameters` — Go template params, used to dynamically modify the SQL statement itself before execution

```go
// Tool invocation flow:
newStatement, err := parameters.ResolveTemplateParams(t.TemplateParameters, t.Statement, paramsMap)
// t.Statement might be: "SELECT * FROM {{.table_name}} WHERE id = $1"
// After template resolve → "SELECT * FROM users WHERE id = $1"

newParams, err := parameters.GetParams(t.Parameters, paramsMap)
sliceParams := newParams.AsSlice()
resp, err := source.RunSQL(ctx, newStatement, sliceParams)
```

`ResolveTemplateParams` uses Go's `text/template` with a custom `array` FuncMap for array-to-SQL-string conversion.

**Why it matters:** Allows dynamic table/schema selection without SQL injection risk — template params control structure, standard params control values. Useful when building generic query tools over unknown schemas.

---

## Pattern 3: RWMutex ResourceManager for Hot Config Reload

**File:** `internal/server/resources/resources.go`, `cmd/root.go`

`ResourceManager` holds all live resources (sources, auth services, tools, toolsets) behind a `sync.RWMutex`. Config reload (via fsnotify or polling) calls `SetResources()` which swaps all maps atomically under write lock. In-flight requests hold a read lock throughout, so they complete against the old resource set.

```go
// Atomic swap of all resources
func (r *ResourceManager) SetResources(sourcesMap, authServicesMap, ...) {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.sources = sourcesMap
    r.authServices = authServicesMap
    // ...
}

// Read path — multiple goroutines can read concurrently
func (r *ResourceManager) GetTool(toolName string) (tools.Tool, bool) {
    r.mu.RLock()
    defer r.mu.RUnlock()
    return r.tools[toolName], ok
}
```

Config watching uses both `fsnotify` (inotify-based) and optional polling (for NFS mounts). A 100ms debounce prevents multi-write editor saves from triggering multiple reloads. Validation (`validateReloadEdits`) runs before `SetResources` — bad config = no swap, server continues on old config with a WarnContext log.

**Why it matters:** Zero-downtime config reload without restart. The validate-before-swap pattern is the key safety mechanism. NFS polling fallback solves cloud filesystem edge cases.

---

## Pattern 4: MCP Protocol Version Negotiation + Multi-Version Dispatch

**File:** `internal/server/mcp/mcp.go`, `internal/server/mcp.go`

Protocol version is determined from the HTTP request, not a config. Three signals in priority order:
1. `MCP-Protocol-Version` header → explicit version (2025-06-18+)
2. `Mcp-Session-Id` header → v2025-03-26
3. `?sessionId=` query param → v2024-11-05 (legacy SSE mode)
4. No signal → stdio/default

```go
// mcp.go - dispatch to versioned handlers
func ProcessMethod(ctx context.Context, mcpVersion string, ...) (any, error) {
    switch mcpVersion {
    case v20251125.PROTOCOL_VERSION:
        return v20251125.ProcessMethod(...)
    case v20250618.PROTOCOL_VERSION:
        return v20250618.ProcessMethod(...)
    // ...
    default:
        return v20241105.ProcessMethod(...)
    }
}
```

During `initialize`, server returns `LATEST_PROTOCOL_VERSION` if client requests an unsupported version — graceful degradation to latest rather than error.

Toolsets are URL-routed: `/mcp/{toolsetName}` — one MCP server exposes multiple namespaced tool subsets at different paths.

**Why it matters:** Backwards compatibility without `if/else` chains inside handlers. Each version has its own `method.go` with independent `CallToolResult` types — clean separation. The SSE session manager (`sseManager`) handles legacy v2024-11-05 clients that require long-lived SSE connections.

---

## Pattern 5: Three-Layer Error Taxonomy for MCP Tool Execution

**File:** `internal/server/mcp/v20251125/method.go`

Tool execution errors are split into two MCP-spec-defined categories with different HTTP/JSON-RPC semantics:

```go
if errors.As(err, &tbErr) {
    switch tbErr.Category() {
    case util.CategoryAgent:
        // Tool ran but produced an error result
        // → Return HTTP 200, JSON-RPC SUCCESS, but Result.IsError = true
        return jsonrpc.JSONRPCResponse{
            Result: CallToolResult{Content: []TextContent{text}, IsError: true},
        }, nil

    case util.CategoryServer:
        // Infrastructure error (auth, internal)
        // → Return JSON-RPC ERROR (-32603 or -32600)
        return jsonrpc.NewError(id, rpcCode, err.Error(), nil), err
    }
}
```

**CategoryAgent** errors (bad SQL, not found, constraint violation) = the agent made a mistake and should be informed so it can retry with different params. **CategoryServer** errors (DB unreachable, auth failed) = infrastructure problem, retry won't help.

Within CategoryServer, 401/403 errors from a `clientAuth` tool map to `INVALID_REQUEST (-32600)` instead of `INTERNAL_ERROR (-32603)` — distinguishing "you need to authenticate" from "server broke."

**Why it matters:** LLM agents can inspect `isError` flag to self-correct without retrying hopelessly. This is the MCP spec requirement for tool errors, not a custom pattern.

---

## Pattern 6: JWT Claims → SQL Parameter Injection

**File:** `internal/server/mcp/v20251125/method.go`, `internal/util/parameters/parameters.go`

Auth parameters are extracted from validated JWT claims and injected as SQL parameters — invisible to the LLM agent. The agent cannot override them.

```yaml
# tools.yaml
parameters:
  - name: user_id
    type: string
    authServices:
      - name: my-google-auth
        field: sub   # JWT claim field
```

```go
// In toolsCallHandler:
for _, aS := range authServices {
    claims, err := aS.GetClaimsFromHeader(ctx, header)
    claimsFromAuth[aS.GetName()] = claims
}

// In ParseParams: parameter marked with authServices → reads from claimsFromAuth
// → injected as $1 in the SQL statement
```

This means `WHERE user_id = $1` with `$1` coming from the JWT `sub` claim — RLS-equivalent pattern at the MCP layer without requiring Postgres RLS.

**Why it matters:** Security boundary between LLM (untrusted) and auth system (trusted). The agent sends SQL-equivalent requests; the server silently enforces user scoping. Critical for multi-tenant MCP tools.

---

## Pattern 7: Dual Transport with Shared Handler — HTTP+SSE and stdio

**File:** `internal/server/server.go`, `internal/server/mcp.go`

Both transports share `processMcpMessage()`. Transport layer differences are abstracted away before reaching MCP logic:

- **HTTP mode:** `s.Listen()` + `s.Serve()` → chi router → `httpHandler` → `processMcpMessage`
- **stdio mode:** `s.ServeStdio()` → `stdioSession.readInputStream()` → line-by-line `processMcpMessage`

stdio passes `header = nil` which disables auth (no headers in stdio). The `readLine` goroutine uses a `done` channel + `select` for context-aware cancellation — avoids blocking the event loop on `ReadString('\n')`.

W3C Trace Context is extracted from `params._meta.traceparent` in both transports, making distributed tracing work across the stdio boundary.

**Why it matters:** stdio mode is used by Claude Desktop / local agents; HTTP mode for remote/cloud deployments. Same tool definitions work in both. The `nil` header check for auth is an important gotcha — stdio tools are implicitly trusted.

---

## Config Format (YAML)

Resources use Kubernetes-style `kind` + `name` fields:

```yaml
kind: source
name: my-pg
type: postgres
host: localhost
port: "5432"
user: app
password: secret
database: mydb

---
kind: tool
name: search_users
type: postgres-sql
source: my-pg
description: "Search users by name"
statement: "SELECT id, name FROM users WHERE name ILIKE $1"
parameters:
  - name: query
    type: string
    description: "Search term"
```

Multi-document YAML (separated by `---`) merges into a single config. Multiple config files can be merged via `--configs` flag.

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `github.com/go-chi/chi/v5` | HTTP router |
| `github.com/jackc/pgx/v5/pgxpool` | PostgreSQL connection pool |
| `github.com/fsnotify/fsnotify` | File watching for config reload |
| `github.com/MicahParks/keyfunc/v3` | JWKS fetching + caching for JWT validation |
| `github.com/golang-jwt/jwt/v5` | JWT parsing |
| `go.opentelemetry.io/otel` | Distributed tracing + metrics |
| `github.com/goccy/go-yaml` | YAML decoding (strict mode) |
| `github.com/google/uuid` | Session IDs |

---

## Relevance for Adil's Projects

- **Omoikiri / News.AI:** The `init()`-based plugin registry pattern is directly applicable to any Node.js/Go system needing extensible connectors without central switch-cases. In Node.js: `Map<string, Factory>` + `register()` called in each module's module-level code.
- **Auth parameter injection** (JWT claims → SQL params) is a clean alternative to Supabase RLS for custom backends that need per-user data scoping without PG-level policies.
- **Hot config reload** with validate-before-swap is the right pattern for any long-running Node.js service that reads YAML/JSON config — use `chokidar` + atomic swap of a module-level config object under a lock equivalent.
- **Two-category error taxonomy** (agent error = retry-safe, server error = don't retry) maps directly to how p-retry should be configured: only retry on CategoryAgent-equivalent errors.

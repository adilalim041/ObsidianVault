# agent-prism (Evil Martians) — Backend Analysis

**Date:** 2026-04-12
**Repo:** `C:/Users/User/Desktop/_study_tmp/agent-prism/`
**Score:** 6.5 — News.AI relevance (LLM observability)
**Stack:** TypeScript pnpm monorepo, React 19, Next.js (SaaS shell), Vite (demo-app), Firebase hosting

---

## What It Is

AgentPrism is an open-source React component library for visualizing OpenTelemetry traces from AI agents. It is NOT a backend tracer or collector — it is a **pure UI/data-transform layer** that sits on top of existing OTEL or Langfuse data. The backend engineering interest is in:

1. The data normalization architecture (`packages/data`)
2. The canonical type system (`packages/types`)
3. The multi-standard detection logic
4. The monorepo build pipeline
5. How the SaaS shell ingests and validates raw trace JSON

---

## Pattern 1 — Typed Adapter Interface for Multi-Standard Normalization

**File:** `packages/data/src/types.ts`

```ts
interface SpanAdapter<TRawDocument, TRawSpan> {
  convertRawDocumentsToSpans(documents: TRawDocument | TRawDocument[]): TraceSpan[];
  convertRawSpansToSpanTree(spans: TRawSpan[]): TraceSpan[];
  convertRawSpanToTraceSpan(span: TRawSpan): TraceSpan;
  getSpanDuration(document: TRawSpan): number;
  getSpanCost(document: TRawSpan): number;
  getSpanTokensCount(document: TRawSpan): number;
  getSpanInputOutput(document: TRawSpan): InputOutputData;
  getSpanStatus(document: TRawSpan): TraceSpanStatus;
  getSpanCategory(document: TRawSpan): TraceSpanCategory;
}
```

Two implementations: `openTelemetrySpanAdapter` (OTLP format with nanosecond timestamps) and `langfuseSpanAdapter` (ISO timestamps, `observations[]` structure). Both produce the same `TraceSpan[]` type that the UI consumes.

**Pattern:** Define a typed adapter interface once. Implement per data source. The UI layer never knows which source was used. Adding a new source (e.g., Weights & Biases, Arize) = implement the interface, no UI changes.

**News.AI application:** Brain service calls OpenAI and Gemini. Wrap each LLM call with an OTEL span (via `@opentelemetry/sdk-node` + `@opentelemetry/instrumentation-openai`). Export to OTLP endpoint. Feed JSON into AgentPrism-style viewer in the Dashboard. No custom tracing infrastructure needed.

---

## Pattern 2 — Two-Pass Tree Assembly from Flat Span List

**File:** `packages/data/src/open-telemetry/adapter.ts` — `convertRawSpansToSpanTree()`

OTLP delivers spans as a flat array with `parentSpanId` references. The adapter rebuilds the tree in two passes:

1. **Pass 1** — `Map<spanId, TraceSpan>` from all spans
2. **Pass 2** — iterate again, for each span with `parentSpanId` look up parent in map, push into `parent.children`. Spans without `parentSpanId` go to `rootSpans[]`

```ts
const spanMap = new Map<string, TraceSpan>();
// pass 1: create all
spans.forEach(span => spanMap.set(span.spanId, convert(span)));
// pass 2: wire parent-child
spans.forEach(span => {
  if (span.parentSpanId) {
    const parent = spanMap.get(span.parentSpanId);
    if (parent) {
      parent.children ??= [];
      parent.children.push(spanMap.get(span.spanId)!);
    }
  } else {
    rootSpans.push(spanMap.get(span.spanId)!);
  }
});
```

**Important:** Spans with an unknown `parentSpanId` (parent not in this batch) are silently dropped to `rootSpans` — they become orphan root spans. This is correct behavior for partial traces or sampled data.

**News.AI application:** Pipeline stage spans (Parser → Brain → Generator → Publisher) naturally nest via this pattern if instrumented with a root "pipeline run" span and child spans per service call.

---

## Pattern 3 — Three-Standard Detection with Priority Fallback

**Files:** `packages/data/src/open-telemetry/utils/get-open-telemetry-span-standard.ts`, `categorize-*.ts`

OTel ecosystem has three competing attribute conventions for AI spans:
- **OpenTelemetry GenAI** (`gen_ai.operation.name`, `gen_ai.system`) — the new standard
- **OpenInference** (`openinference.span.kind`, `llm.model_name`) — LlamaIndex/Arize convention
- **Standard OTEL** — HTTP, DB, function spans with keyword heuristics

Detection order: check for `gen_ai.*` attributes first, then `openinference.*`, default to standard. Within each standard, category resolution also has a fallback chain:

```ts
case "opentelemetry_genai": {
  const category = categorizeOpenTelemetryGenAI(span); // by gen_ai.operation.name exact match
  return category !== "unknown"
    ? category
    : categorizeStandardOpenTelemetry(span); // keyword fallback
}
```

Category mapping for GenAI operations (in `span-mappings.ts`):
```ts
chat → "llm_call"
generate_content → "llm_call"
execute_tool → "tool_execution"
invoke_agent → "agent_invocation"
embeddings → "embedding"
```

Standard fallback uses keyword matching on `span.name`:
- `["openai", "anthropic", "gpt", "claude"]` → `llm_call`
- `["agent"]` → `agent_invocation`
- `["chain", "workflow", "langchain"]` → `chain_operation`
- `["tool", "function"]` → `tool_execution`

**News.AI application:** When adding OTEL instrumentation to `adilflow_brain`, emit `gen_ai.operation.name = "chat"` on every OpenAI call and `gen_ai.operation.name = "generate_content"` on every Gemini call. AgentPrism will correctly categorize them without custom mapping.

---

## Pattern 4 — Nanosecond Timestamp Arithmetic with BigInt

**File:** `packages/data/src/open-telemetry/adapter.ts` — `getSpanDuration()`

OTLP timestamps are Unix nanoseconds stored as **strings** (they exceed Number.MAX_SAFE_INTEGER for recent timestamps). Standard JS `Number` arithmetic would silently lose precision:

```ts
getSpanDuration(span: OpenTelemetrySpan): number {
  const startNano = BigInt(span.startTimeUnixNano);  // "1749823456789012345"
  const endNano = BigInt(span.endTimeUnixNano);
  const durationNano = endNano - startNano;
  return Number(durationNano / BigInt(1_000_000));   // safe: duration fits in Number
}
```

The trick: full timestamps as BigInt (precision required), but duration (which is milliseconds, fits in Number) is converted back to Number after division. Timeline positioning also uses `+new Date(span.startTime)` after the Date conversion, which is fine because `convertNanoTimestampToDate` does `new Date(Number(nano / BigInt(1_000_000)))` — same pattern.

**News.AI / general backend:** Any time you store OTEL-compatible timestamps from Node.js performance APIs (`performance.now()` gives float ms, not ns), convert to nanosecond strings when emitting OTLP. Pino already logs in ms — convert: `BigInt(Math.round(Date.now() * 1_000_000)).toString()`.

---

## Pattern 5 — Duck-Type Dispatch for Multi-Format JSON Ingestion

**File:** `packages/saas/src/services/extract-spans.ts`

The SaaS app accepts raw trace JSON uploads. Instead of requiring users to declare format, it probes the shape:

```ts
export const extractSpans = (data: object): TraceSpan[] => {
  // OTLP single document
  if ("resourceSpans" in data && Array.isArray(data.resourceSpans)) ...

  // OTLP array of documents
  if (Array.isArray(data) && data.every(item => "resourceSpans" in item)) ...

  // Langfuse export
  if ("trace" in data || "observations" in data) ...

  // Already-normalized TraceSpan[]
  if (Array.isArray(data) && data.every(isValidTraceSpan)) ...

  // { spans: TraceSpan[] }
  if ("spans" in data && Array.isArray(data.spans) && data.spans.every(isValidTraceSpan)) ...

  // { data: TraceSpan[] }
  if ("data" in data && Array.isArray(data.data) && ...) ...

  // Single span
  if (isValidTraceSpan(data)) return [data];

  throw new Error("Invalid trace format. Expected OpenTelemetry or Langfuse.");
};
```

`isValidTraceSpan` is a structural guard checking for required fields: `id`, `title`, `startTime`, `endTime`, `duration`, `type`, `status`, `raw`.

**News.AI application:** `adilflow_brain` could expose a `/traces` endpoint that returns trace data in `{ data: TraceSpan[] }` shape — the AgentPrism SaaS (or a copy in the Dashboard) would auto-detect this format without configuration.

---

## Pattern 6 — Cost Extraction with Dual Attribute Fallback

**File:** `packages/data/src/open-telemetry/adapter.ts` — `getSpanCost()`

```ts
getSpanCost(span): number {
  const inputCost = getAttr(span, "gen_ai.usage.input_cost");   // new standard
  const outputCost = getAttr(span, "gen_ai.usage.output_cost"); // new standard
  let total = 0;
  if (typeof inputCost === "number") total += inputCost;
  if (typeof outputCost === "number") total += outputCost;

  if (total === 0) {
    const fallback = getAttr(span, "gen_ai.usage.cost");       // legacy single field
    if (typeof fallback === "number") total = fallback;
  }
  return total;
}
```

Tokens similarly: try `gen_ai.usage.total_tokens` first, fallback to `input + output`.

**News.AI application:** When emitting spans from Brain/Generator, add `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, and `gen_ai.usage.cost` attributes. The cost formula for OpenAI is already tracked in Brain (from `llm-gateway` pattern: store in microcents). Convert to dollars when writing span attributes.

---

## Pattern 7 — Recursive Tree Search Preserving Matched-Ancestor Paths

**File:** `packages/data/src/common/filter-spans-recursively.ts`

Search in a span tree requires preserving parent nodes even if only a child matches:

```ts
// Keep span if: (a) it matches, or (b) any descendant matches
const currentSpanMatches = span.title.toLowerCase().includes(query);
const filteredChildren = filterSpansRecursively(span.children, query);
const hasMatchingChildren = filteredChildren && filteredChildren.length > 0;

if (currentSpanMatches || hasMatchingChildren) {
  return { ...span, children: filteredChildren };
}
return null; // prune
```

Result: searching "openai" in a 3-level tree returns the root agent span + the llm_call child, not just the isolated llm_call. The path to a match is always visible.

---

## Monorepo Architecture

```
packages/
  types/    — shared TypeScript types (TraceSpan, TraceRecord, OTEL types, Langfuse types, attribute constants)
  data/     — pure TS data transforms (adapters, tree utils, timeline math). Zero React. Zero DOM.
  ui/       — React components (TraceViewer, TreeView, DetailsView, TraceList). Copy-paste install via degit.
  saas/     — Next.js 15 App Router deployment (agent-prism.evilmartians.io). Firebase hosting.
  demo-app/ — Vite demo with 3 sample traces (RAG, deep research, trading agent).
  storybook/ — component docs
```

Build order enforced by pnpm:
```
pnpm --filter './packages/{types,data}' build   # first: no React deps
pnpm --filter './packages/{ui,demo-app,...}' build  # second: can import types+data
```

`ui` components are distributed via `degit` (copy-paste), not npm package with styles — avoids Tailwind CSS version conflicts. `data` and `types` ARE npm packages (`@evilmartians/agent-prism-data`, `@evilmartians/agent-prism-types`).

**Requires Node >= 24** (root `package.json engines`). Contrast with News.AI which uses Node 18 + `p-retry@6` (downgraded from v8 ESM).

---

## News.AI Integration Recommendations

### Minimal: JSON trace export in Dashboard

1. In `adilflow_brain`, after each pipeline run, collect timing data already available from Pino logs (`latencyMs`, `provider`, `outcome`, `articleId`) and emit a synthetic OTLP JSON blob saved to Supabase `pipeline_traces` table.
2. Dashboard `/traces` page: fetch from Brain, pass to `openTelemetrySpanAdapter.convertRawDocumentsToSpans()`, render with AgentPrism `TraceViewer`.
3. Zero new dependencies on Node side. AgentPrism `data` and `types` packages on frontend only.

### Full: Real OTEL instrumentation in Brain

1. Add `@opentelemetry/sdk-node` + `@opentelemetry/instrumentation-openai` to `adilflow_brain`.
2. Configure `OTLPTraceExporter` pointing to a lightweight collector (Jaeger, Grafana Tempo, or even a plain OTLP HTTP endpoint that appends to Supabase).
3. Every OpenAI and Gemini call automatically emits spans with `gen_ai.*` attributes — tokens, cost, model, latency.
4. Dashboard fetches and visualizes.

### Why This Matters for News.AI

Current observability: Pino logs per call, no cross-call correlation, no way to see "this article's full pipeline took 14s: 2s parse, 8s image gen (2 retries), 4s publish". AgentPrism + OTEL would give exactly this view.

The `articleId` already in every Pino log is a natural trace root ID. Use it as `traceId`.

---

## Key Attribute Constants (for instrumentation)

When adding spans to News.AI services, use these attribute keys for AgentPrism to auto-detect:

| Attribute | Value example | Effect |
|---|---|---|
| `gen_ai.operation.name` | `"chat"` | categorized as `llm_call` |
| `gen_ai.operation.name` | `"generate_content"` | categorized as `llm_call` |
| `gen_ai.request.model` | `"gpt-4o-mini"` | shown in span title |
| `gen_ai.system` | `"openai"` | triggers GenAI standard detection |
| `gen_ai.usage.input_tokens` | `150` | token count display |
| `gen_ai.usage.output_tokens` | `42` | token count display |
| `gen_ai.usage.cost` | `0.00023` | cost aggregation |
| `input.value` | prompt string | shown in Details panel |
| `output.value` | completion string | shown in Details panel |

---

## Learnings for backend-expert

- agent-prism: OTLP nanosecond timestamps stored as strings — must use BigInt arithmetic to avoid silent precision loss. Safe to convert back to Number only for the duration (milliseconds), not for absolute timestamps.
- agent-prism: Multi-standard OTEL detection pattern — probe for `gen_ai.*` attributes first (new standard), then `openinference.*`, then keyword matching on span.name as last resort. Use this priority order when writing your own OTEL consumers.
- agent-prism: Duck-type dispatch over format detection — probe JSON shape (`"resourceSpans" in data`, `"observations" in data`) rather than requiring a `format` parameter. Enables zero-config upload UX.
- agent-prism: `articleId` already in Pino logs is a natural OTEL `traceId` — correlating all pipeline spans under one root gives full latency breakdown per article without new IDs.
- agent-prism: `@evilmartians/agent-prism-data` and `@evilmartians/agent-prism-types` are npm-installable; `ui` components are copy-paste via `degit packages/ui/src/components` — avoids Tailwind version conflicts.

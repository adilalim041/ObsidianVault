# llm-gateway — Backend Deep Analysis

**Repo:** nullrabbitlabs/llm-gateway
**Study date:** 2026-04-12
**Score:** 8.2
**Stack:** Python 3.11+, FastAPI, Pydantic v2, httpx, openai SDK, anthropic SDK, google-genai SDK

---

## Overview

LLM proxy/router written in Python. Exposes a unified HTTP API (OpenAI-compatible) over multiple LLM backends: Ollama (local), DeepSeek, Gemini, OpenAI, Anthropic. Key value: provider auto-fallback, cost tracking in microcents, per-provider feature flags, zero-config model override per request.

**Architecture is flat:** no framework abstractions, no DI container.
```
main.py           — FastAPI app, endpoints, Pydantic models
config.py         — Config dataclass, from_env(), validates at startup
providers.json    — All provider definitions (external config, no code changes to add provider)
providers/
  base.py         — Provider ABC, LLMResponse dataclass, retry logic
  registry.py     — Loads providers.json, lazy-imports provider classes, instantiates them
  openai_compatible.py — Covers OpenAI + DeepSeek + any OpenAI-compatible API
  anthropic_provider.py
  gemini.py
  ollama.py
services/
  llm_service.py  — Fallback chain over providers[]
  embedding_service.py
tests/ — TDD, 100% mock-based, no real API calls
```

---

## Pattern 1: JSON-externalized provider registry with lazy imports

**Problem:** Adding a new LLM provider (e.g. Groq, Together AI) normally requires: a new Python class, editing a factory, redeploying. Here — add one entry to `providers.json`, zero code changes if it's OpenAI-compatible.

**How it works:**

`providers.json` defines every provider as a typed config entry:
```json
{
  "auto_priority": ["ollama", "deepseek", "gemini", "openai", "anthropic"],
  "providers": {
    "deepseek": {
      "kind": "openai_compatible",
      "base_url": "https://api.deepseek.com",
      "env_key": "DEEPSEEK_API_KEY",
      "env_model": "DEEPSEEK_MODEL",
      "default_model": "deepseek-chat",
      "timeout": 300,
      "api_params": { "max_tokens": 8192 },
      "features": { "reasoning_content": true, "tool_calls": true, "json_mode": false },
      "pricing": { "input_per_1k_microcents": 0.12, "output_per_1k_microcents": 0.20 }
    }
  }
}
```

`registry.py` parses this into `ProviderConfig` dataclasses and instantiates providers with lazy imports:
```python
# kind -> (module_path, class_name) — lazy imports to avoid loading unused SDKs
_KIND_MAP: dict[str, tuple[str, str]] = {
    "openai_compatible": ("providers.openai_compatible", "OpenAICompatibleProvider"),
    "anthropic": ("providers.anthropic_provider", "AnthropicProvider"),
    "gemini": ("providers.gemini", "GeminiProvider"),
    "ollama": ("providers.ollama", "OllamaProvider"),
}

def create_provider(pc: ProviderConfig) -> Provider:
    import importlib
    entry = _KIND_MAP.get(pc.kind)
    module_path, class_name = entry
    mod = importlib.import_module(module_path)
    cls = getattr(mod, class_name)
    model = _resolve_model(pc)
    if pc.kind == "ollama":
        return cls(host=_resolve_host(pc), model=model, config=pc)
    else:
        return cls(api_key=_resolve_api_key(pc), model=model, config=pc)
```

**Why lazy imports matter:** The anthropic SDK, google-genai, openai packages are all heavy. If you only configure DeepSeek, the other SDKs are never imported. Cold start in containers stays fast.

**Per-provider feature flags** (`features` dict in JSON) drive runtime behavior inside each provider:
```python
# In OpenAICompatibleProvider.__init__:
self._json_mode: bool = features.get("json_mode", False)
self._reasoning_content: bool = features.get("reasoning_content", False)

# In _call_api:
if self._json_mode:
    kwargs["response_format"] = {"type": "json_object"}

# In _call_api_with_tools:
reasoning_content = getattr(message, "reasoning_content", None) if self._reasoning_content else None
```

**Adding Groq** would be: add `"groq": { "kind": "openai_compatible", "base_url": "https://api.groq.com/openai/v1", ... }` to providers.json. Done.

**Relevance to News.AI:** adilflow_brain currently has provider selection hardcoded (OpenAI for text, Gemini for images). This pattern would let you add DeepSeek as a cheap text fallback with zero code changes — just env vars. The `auto_priority` array gives cost-ordered fallback: try cheap first, escalate.

---

## Pattern 2: Auto-fallback chain with aggregated error collection

**Problem:** Single provider calls fail silently or raise hard. What the caller needs: try provider A, if it fails try B, if all fail throw with ALL error messages combined.

**LLMService implements this:**
```python
class AllProvidersFailedError(Exception):
    pass

class LLMService:
    def call(self, prompt: str, system_prompt=None, model_override=None) -> LLMResponse:
        errors = []

        for provider in self.providers:  # ordered by auto_priority
            try:
                log.info(f"Calling provider: {provider.name}")
                response = provider.call(prompt, system_prompt, model_override=model_override)
                log.info(f"Provider {provider.name} succeeded: {response.prompt_tokens} prompt tokens, "
                         f"{response.completion_tokens} completion tokens, {response.latency_ms}ms")
                return response
            except ProviderError as e:
                log.warning(f"Provider {provider.name} failed: {e}")
                errors.append(f"{provider.name}: {e}")
                continue  # <-- key: don't re-raise, collect and try next

        error_msg = "All providers failed:\n" + "\n".join(errors)
        log.error(error_msg)
        raise AllProvidersFailedError(error_msg)
```

`self.providers` is built from `auto_priority` order: `["ollama", "deepseek", "gemini", "openai", "anthropic"]`. The priority is cost-ordered (local/free first, most expensive last).

**The same pattern is used for `call_with_tools`** — separate method, same loop structure. Tool-capable calls stay in that path; simple prompt/response calls go through `call()`.

**In auto mode:** `create_providers_for_mode("auto", auto_priority, configs)` only instantiates providers whose env vars are set — so the fallback list is only as long as what you've configured.

**Relevance to News.AI:** This is exactly what adilflow_brain needs for article classification. Currently if OpenAI is down, the whole pipeline stops. With this pattern: OpenAI fails → DeepSeek takes over → Gemini takes over. The `AICallLog` in every response tells you which provider actually served the request, so you can track which fallbacks are firing in Railway logs.

**Relevance to Nexus.AI:** The Python assistant has a dual-backend pattern (Supabase/SQLite). Same collect-and-continue idea, different domain.

---

## Pattern 3: Per-provider retry with 4xx non-retryable guard

**Problem:** Naive retry loops retry auth errors (401), bad requests (400) — wasteful and delays the real error. Need to retry only transient failures (timeouts, rate limits, 5xx) while fast-failing on client errors.

**Implementation in `Provider.call()` (base.py):**
```python
def call(self, prompt, system_prompt=None, model_override=None) -> LLMResponse:
    max_retries = 2
    delay = 2.0  # seconds, doubles each attempt (exponential backoff)

    for attempt in range(max_retries + 1):
        try:
            start_time = time.time()
            response = self._call_api(prompt, system_prompt, model_override=model_override)
            response.latency_ms = int((time.time() - start_time) * 1000)
            return response
        except RateLimitError as e:
            # Rate limit: always retry with backoff
            if attempt < max_retries:
                log.warning(f"{self.name}: Rate limit hit, retrying in {delay}s (attempt {attempt + 1})")
                time.sleep(delay)
                delay *= 2
            else:
                raise ProviderError(f"{self.name} rate limited after {max_retries + 1} attempts") from e
        except Exception as e:
            error_str = str(e).lower()
            # 4xx errors: non-retryable, fail immediately
            is_client_error = any(
                f"error code: {code}" in error_str or f" {code} " in error_str
                for code in ["400", "401", "403", "404", "422"]
            )
            if is_client_error:
                raise ProviderError(f"{self.name} call failed (non-retryable 4xx): {e}") from e
            # Transient errors: retry
            is_retryable = any(
                keyword in error_str
                for keyword in ["timeout", "connection", "rate limit", "429", "502", "503", "504"]
            )
            if is_retryable and attempt < max_retries:
                log.warning(f"{self.name}: Retryable error, retrying in {delay}s: {e}")
                time.sleep(delay)
                delay *= 2
            else:
                raise ProviderError(f"{self.name} call failed: {e}") from e

    raise ProviderError(f"{self.name} call failed after all retries")
```

**Each provider raises `RateLimitError` explicitly when it detects 429:**
```python
# In OpenAICompatibleProvider._call_api:
except Exception as e:
    error_str = str(e).lower()
    if "rate limit" in error_str or "429" in error_str:
        raise RateLimitError(str(e)) from e
    raise

# In AnthropicProvider — uses SDK's typed exception:
except anthropic.RateLimitError as e:
    raise RateLimitError(str(e)) from e

# In GeminiProvider — also checks for "quota":
if "rate limit" in error_str or "429" in error_str or "quota" in error_str:
    raise RateLimitError(str(e)) from e
```

**Key insight:** `RateLimitError` is a subclass of `ProviderError`, so the retry logic at the `Provider.call()` level can distinguish between "rate limited (retry with backoff)" vs "generic error (check if transient)" vs "client error (never retry)". 3 distinct code paths from one exception hierarchy.

**Note vs News.AI's p-retry approach:** News.AI uses `p-retry` (Node.js) with `AbortError` for 4xx. This Python gateway implements the same contract but synchronously (`time.sleep` not async). For a dedicated gateway service that's fine — it's not serving concurrent requests per thread, it's synchronous per-request. If ported to async, `await asyncio.sleep(delay)` would be the change.

---

## Pattern 4: Cross-provider tool call normalization (OpenAI format as canonical)

**Problem:** Each LLM provider has a completely different format for tool calls (function calling). OpenAI has `tool_calls[].function.{name, arguments}`. Anthropic has `content[].type="tool_use"` with `input` dict. Gemini doesn't support tool calls. Ollama has `message.tool_calls[].function.{name, arguments}` (similar to OpenAI but `arguments` is already a dict, not a JSON string). The caller should send one format and get one format back.

**The gateway uses OpenAI format as the canonical wire format.** Anthropic gets a full translation layer:

```python
# anthropic_provider.py
def _convert_messages_to_anthropic(messages: list) -> tuple[str | None, list]:
    """Convert OpenAI-format messages to Anthropic format."""
    system_text = None
    converted = []
    tool_result_buffer: list[dict] = []

    def flush_tool_results():
        # Anthropic requires tool results grouped into a single "user" message
        if tool_result_buffer:
            converted.append({"role": "user", "content": list(tool_result_buffer)})
            tool_result_buffer.clear()

    for msg in messages:
        role = msg.get("role")

        if role == "system":
            system_text = msg.get("content", "")
            continue  # Anthropic puts system outside messages[]

        if role == "tool":
            # OpenAI: {"role": "tool", "tool_call_id": "...", "content": "..."}
            # Anthropic: content block of type "tool_result" inside user message
            tool_result_buffer.append({
                "type": "tool_result",
                "tool_use_id": msg.get("tool_call_id", ""),
                "content": msg.get("content", ""),
            })
            continue

        flush_tool_results()  # tool results must be flushed before non-tool messages

        if role == "assistant" and msg.get("tool_calls"):
            # OpenAI assistant with tool_calls -> Anthropic tool_use content blocks
            content_blocks: list[dict] = []
            text = msg.get("content")
            if text:
                content_blocks.append({"type": "text", "text": text})
            for tc in msg["tool_calls"]:
                fn = tc.get("function", {})
                args_str = fn.get("arguments", "{}")
                input_dict = _parse_tool_arguments(args_str)
                content_blocks.append({
                    "type": "tool_use",
                    "id": tc.get("id", ""),
                    "name": fn.get("name", ""),
                    "input": input_dict,  # dict, not JSON string
                })
            converted.append({"role": "assistant", "content": content_blocks})
        else:
            converted.append(msg)

    flush_tool_results()
    return system_text, converted


def _convert_tools_to_anthropic(tools: list) -> list:
    """Convert OpenAI function schemas to Anthropic tool format."""
    result = []
    for tool in tools:
        fn = tool.get("function", {})
        result.append({
            "name": fn.get("name", ""),
            "description": fn.get("description", ""),
            "input_schema": fn.get("parameters", {}),  # OpenAI: "parameters", Anthropic: "input_schema"
        })
    return result
```

**On response normalization** — Anthropic returns `stop_reason` not `finish_reason`, with different strings. The gateway maps them:
```python
_STOP_REASON_MAP = {
    "end_turn": "stop",      # Anthropic -> OpenAI
    "tool_use": "tool_calls", # Anthropic -> OpenAI
}
stop_reason = getattr(response, "stop_reason", "end_turn") or "end_turn"
finish_reason = _STOP_REASON_MAP.get(stop_reason, stop_reason)
```

**Ollama quirk:** Ollama returns tool call `arguments` as a Python dict (already parsed), not as a JSON string like OpenAI. The gateway handles this:
```python
# ollama.py
args = fn.get("arguments", {})
if isinstance(args, str):
    args = _parse_tool_arguments(args)  # parse if string
# else: already a dict, use directly
```

**Ollama also doesn't generate tool call IDs** — they have to be synthesized:
```python
ToolCall(
    id=f"call_{uuid.uuid4().hex[:24]}",  # synthesized ID
    name=fn.get("name", ""),
    arguments=args,
)
```

**`reasoning_content` field** — DeepSeek Reasoner returns chain-of-thought in `reasoning_content` alongside the actual response. The gateway surfaces this on the response object if `features.reasoning_content=true` in providers.json. The endpoint passes it through to the client:
```python
if result.reasoning_content is not None:
    message_dict["reasoning_content"] = result.reasoning_content
```

**Relevance to News.AI:** adilflow_generator and brain use Gemini + OpenAI. When a future task requires tool calls (e.g., Brain calling a search tool), you'd need exactly this translation layer to swap providers without changing call sites.

---

## Pattern 5: Resilient JSON parsing for LLM tool arguments

**Problem:** LLMs return tool call arguments as strings that are *almost* valid JSON but have common formatting issues: wrapped in markdown code fences (` ```json\n{...}\n``` `), trailing commas before `}` or `]`, etc. A naive `json.loads()` throws and loses the response.

**Three-pass parse with graceful degradation:**
```python
def _parse_tool_arguments(args_str: str) -> dict:
    """Parse tool call arguments JSON with resilience for common LLM formatting errors."""
    # Pass 1: try direct parse
    try:
        return json.loads(args_str)
    except (json.JSONDecodeError, TypeError):
        pass

    # Pass 2: strip markdown fences
    stripped = re.sub(r"^```(?:json)?\s*\n?(.*?)\n?```$", r"\1", args_str.strip(), flags=re.DOTALL)
    try:
        return json.loads(stripped)
    except (json.JSONDecodeError, TypeError):
        pass

    # Pass 3: strip trailing commas before } or ]
    cleaned = re.sub(r",\s*([}\]])", r"\1", stripped)
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, TypeError):
        pass

    # Last resort: preserve the raw string as a parse error marker
    log.warning("Failed to parse tool arguments: %r", args_str)
    return {"_parse_error": args_str}
```

**`strip_markdown_fences` for response text** — same logic, simpler implementation (not a multi-pass regex, just strip known prefixes/suffixes):
```python
def strip_markdown_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()
```

**Why `{"_parse_error": args_str}` instead of raising?** The function call still reaches the tool with a sentinel value. The tool itself can detect `_parse_error` and handle gracefully, rather than the whole request blowing up. Defensive design.

**Relevance to News.AI:** adilflow_brain already does resilient JSON parsing for AI responses (learned 2026-04-09). The `_parse_tool_arguments` function is a cleaner implementation than what's in brain — the multi-pass approach with the `_parse_error` sentinel is worth adopting.

---

## Pattern 6: Cost tracking in microcents with per-provider pricing tables

**Problem:** LLM costs vary 1000x between providers (Gemini at $0.0001/1k input vs Anthropic at $0.30/1k input). Need to track costs without floating-point drift, and return them on every call for audit logging.

**Pricing is defined in providers.json per provider:**
```json
"deepseek": { "pricing": { "input_per_1k_microcents": 0.12, "output_per_1k_microcents": 0.20 } },
"openai":   { "pricing": { "input_per_1k_microcents": 15.0,  "output_per_1k_microcents": 60.0 } },
"anthropic":{ "pricing": { "input_per_1k_microcents": 300.0, "output_per_1k_microcents": 1500.0 } },
"gemini":   { "pricing": { "input_per_1k_microcents": 0.10,  "output_per_1k_microcents": 0.40 } },
"ollama":   { "pricing": { "input_per_1k_microcents": 0,     "output_per_1k_microcents": 0 } }
```

**Cost computation (per provider, same formula):**
```python
def _compute_cost(self, prompt_tokens: int, completion_tokens: int) -> int:
    input_cost = (prompt_tokens / 1000) * self._input_cost_per_1k
    output_cost = (completion_tokens / 1000) * self._output_cost_per_1k
    return round(input_cost + output_cost)  # returns int microcents
```

**Microcents = dollars * 10^8.** Storing as integer avoids floating-point accumulation errors when summing thousands of calls. At Anthropic's pricing, 1 token in = 0.3 microcents. A 1000-token prompt = 300 microcents = $0.000003.

**Embedding costs are tracked separately** (per million tokens, not per thousand):
```python
EMBEDDING_COSTS = {
    "text-embedding-ada-002": 0.10,   # $ per million tokens
    "text-embedding-3-small": 0.02,
    "text-embedding-3-large": 0.13,
}

cost_microcents = int((prompt_tokens / 1_000_000) * cost_per_million * 100_000_000)
```

**`AICallLog`** is returned on every endpoint response — provider, model, tokens, cost_microcents, latency_ms, success. This is the audit trail. There's no database writes — the caller (or their log aggregator) is responsible for persisting it.

**Relevance to News.AI:** Brain could aggregate `cost_microcents` from every AI call and track daily/weekly spend per niche. Currently there's no cost visibility. The `AICallLog` model is a clean copy-paste.

---

## Pattern 7: Dual versioned API routes with explicit deprecation

**Problem:** You need to version your API but also keep old clients working. FastAPI's `deprecated=True` flag marks routes in the OpenAPI schema without removing them.

**Implementation:**
```python
# New versioned router
v1_router = APIRouter(prefix="/api/v1.0", tags=["v1.0"])

@v1_router.post("/classify", response_model=ClassifyResponse)
async def classify(request: ClassifyRequest) -> ClassifyResponse:
    ...

app.include_router(v1_router)

# Legacy routes — same handler functions, marked deprecated
app.add_api_route(
    "/classify",
    classify,             # same function reference
    methods=["POST"],
    response_model=ClassifyResponse,
    deprecated=True,      # shows strikethrough in Swagger UI
    tags=["legacy"],
    name="legacy_classify"  # must be unique
)
```

**Test to enforce this contract:**
```python
def test_legacy_routes_marked_deprecated(self):
    openapi = client.get("/openapi.json").json()
    assert openapi["paths"]["/classify"]["post"]["deprecated"] is True
    assert openapi["paths"]["/api/v1.0/classify"]["post"].get("deprecated") is not True
```

**Relevance to adilflow_brain:** Brain's API currently has no versioning. When breaking changes are needed (response shape, new required fields), this pattern lets you add `/api/v1.0/` routes without breaking the dashboard frontend which calls the old routes.

---

## Startup validation pattern (fail fast)

The app validates all configuration at startup before accepting requests. If no provider is configured, the process crashes immediately with a clear error instead of failing at the first request:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    log.info("Starting LLM Gateway...")
    try:
        validate_api_keys()    # raises ValueError if no providers configured
        verify_credentials()   # instantiates LLMService
        log.info("LLM Gateway started successfully")
    except Exception as e:
        log.error(f"Startup failed: {e}")
        raise  # crash the process, not silently continue

    yield
    log.info("LLM Gateway shutting down")
```

Railway (and Docker in general) will mark the deployment as failed if the process exits during startup. This is intentional — better to fail deploy than to deploy a broken service.

---

## What's NOT in this gateway (known gaps)

1. **No circuit breaker** — if provider A fails 100 requests in a row, it still gets tried on request 101. There's no state tracking of provider health. A proper circuit breaker would skip providers that have been failing continuously and only re-probe after a cooldown. (p-retry's `onFailedAttempt` callback could implement this.)

2. **No async** — all provider calls use `time.sleep()` not `asyncio.sleep()`. FastAPI endpoints are `async def` but the blocking sleep inside `provider.call()` blocks the event loop thread. Under load this would serialize all in-flight requests. For a single-tenant gateway (one agent calling it), this is fine. For multi-tenant use, needs `asyncio.sleep` + `httpx.AsyncClient`.

3. **No persistent cost storage** — `AICallLog` is returned to the caller but not written to a DB. Cost tracking is opt-in per caller.

4. **No streaming** — all responses are buffered. Gemini/OpenAI/Anthropic all support streaming. Not implemented.

5. **Gemini tool calls not supported** — `features.tool_calls=false` in providers.json. The `_call_api_with_tools` method in base.py raises `ProviderError` by default and GeminiProvider doesn't override it. So `call_with_tools` with Gemini in the fallback chain will skip Gemini entirely.

---

## Adapting for News.AI (adilflow_brain)

Brain currently calls OpenAI directly (gpt-4o-mini for classification/generation). The gateway pattern would give:

1. **Cost-ordered auto-fallback**: `auto_priority: ["deepseek", "openai"]` — DeepSeek for classification (x100 cheaper), OpenAI as fallback.
2. **`AICallLog` on every Brain call**: surface cost per article in dashboard.
3. **Model override per-request**: Playbooks could specify `model: "deepseek-chat"` to override for specific niches.

**Node.js port of the core fallback loop** (for adilflow_brain):
```javascript
// Minimal port of the fallback pattern for Node.js
class LLMGateway {
  constructor(providers) {
    this.providers = providers; // ordered by priority
  }

  async call(prompt, systemPrompt = null, modelOverride = null) {
    const errors = [];
    for (const provider of this.providers) {
      try {
        const result = await provider.call(prompt, systemPrompt, modelOverride);
        return result; // first success wins
      } catch (err) {
        errors.push(`${provider.name}: ${err.message}`);
        logger.warn({ provider: provider.name, err }, 'provider failed, trying next');
      }
    }
    throw new Error(`All providers failed:\n${errors.join('\n')}`);
  }
}
```

---

## Learnings to add to backend-expert/learnings.md

1. JSON-externalized provider registry with lazy imports avoids loading unused SDKs — critical for cold start in containers.
2. Separate `RateLimitError` subclass enables three-way retry logic: rate-limited (retry with backoff), transient (retry if keyword match), client error 4xx (fail immediately, no retry).
3. Tool call argument parsing needs 3-pass fallback: direct JSON → strip markdown fences → strip trailing commas → sentinel dict.
4. `{"_parse_error": raw_string}` sentinel in failed tool argument parsing keeps the call alive; downstream tool can detect and handle, vs crashing the whole request.
5. OpenAI format as canonical for tool calls: translate IN (other formats → OpenAI), translate OUT (OpenAI → provider). One translation layer per provider, not N*M.
6. Anthropic tool results must be grouped into a single `user` role message — `flush_tool_results()` pattern with a buffer handles this correctly.
7. Ollama does NOT generate tool call IDs — synthesize with `uuid.uuid4().hex[:24]`.
8. FastAPI `deprecated=True` on `add_api_route()` marks old routes in OpenAPI schema without removing them — clean migration path.
9. LLM cost tracking: store in microcents (integer), not dollars (float). Avoids floating-point accumulation in aggregation.

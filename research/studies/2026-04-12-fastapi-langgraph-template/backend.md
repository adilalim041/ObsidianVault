# Backend Analysis: fastapi-langgraph-agent-production-ready-template

**Date:** 2026-04-12
**Score:** 7.2
**Repo:** `C:/Users/User/Desktop/_study_tmp/fastapi-langgraph/`
**Stack:** FastAPI + LangGraph + PostgreSQL (psycopg3) + mem0 + Langfuse + structlog + Prometheus

---

## Architecture overview

```
FastAPI app
├── api/v1/
│   ├── auth.py          — register/login/session management (JWT)
│   └── chatbot.py       — /chat, /chat/stream, /messages
├── core/
│   ├── langgraph/
│   │   ├── graph.py     — LangGraphAgent class (the core)
│   │   └── tools/       — ask_human (interrupt), duckduckgo_search
│   ├── config.py        — env-aware Settings (no pydantic-settings)
│   ├── logging.py       — structlog + ContextVar per-request binding
│   ├── metrics.py       — prometheus_client counters/histograms
│   ├── middleware.py    — MetricsMiddleware + LoggingContextMiddleware
│   └── observability.py — Langfuse CallbackHandler
├── services/
│   ├── database.py      — SQLModel + QueuePool (sync, for user/session data)
│   ├── llm.py           — LLMRegistry + LLMService (circular fallback)
│   └── memory.py        — MemoryService wrapping mem0 AsyncMemory + pgvector
└── evals/
    └── evaluator.py     — LLM-as-judge scoring via Langfuse traces
```

Two separate Postgres connection paths coexist:
- `AsyncConnectionPool` (psycopg3) — for `AsyncPostgresSaver` (LangGraph checkpoints)
- `create_engine` QueuePool (SQLAlchemy sync) — for user/session CRUD via SQLModel

---

## Pattern 1: LangGraph GraphState with add_messages reducer

**File:** `app/schemas/graph.py`

```python
from typing import Annotated
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field

class GraphState(BaseModel):
    messages: Annotated[list, add_messages] = Field(default_factory=list)
    long_term_memory: str = Field(default="")
```

`Annotated[list, add_messages]` is the LangGraph reducer annotation. Instead of replacing the messages list on each state update, LangGraph calls `add_messages()` to merge: new HumanMessage appended, AIMessage with same id updated in place. This is NOT a regular list assignment — it's a merge function declared at type-annotation level.

`long_term_memory` is a plain string field — overwritten on each invocation with fresh vector-search results before the `_chat` node runs.

**Nexus relevance:** Nexus currently has no state graph — intent is classified then handler is dispatched linearly. If you add multi-step tool use (web search → summarize → respond), this `GraphState` pattern is the right foundation. The key insight: put reducible state (messages history) in `Annotated[..., reducer_fn]`, put ephemeral context (retrieved memories) as plain fields.

---

## Pattern 2: Circular LLM Fallback with per-model tenacity retries

**File:** `app/services/llm.py`

Two-layer error handling:

**Inner layer — tenacity on a single model:**
```python
@retry(
    stop=stop_after_attempt(settings.MAX_LLM_CALL_RETRIES),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((RateLimitError, APITimeoutError, APIError)),
    before_sleep=before_sleep_log(logger, "WARNING"),
    reraise=True,
)
async def _call_llm_with_retry(self, messages):
    return await self._llm.ainvoke(messages)
```

**Outer layer — circular walk through registry on OpenAIError:**
```python
async def call(self, messages, model_name=None, **model_kwargs):
    total_models = len(LLMRegistry.LLMS)
    models_tried = 0
    while models_tried < total_models:
        try:
            response = await self._call_llm_with_retry(messages)
            return response
        except OpenAIError as e:
            models_tried += 1
            if models_tried >= total_models:
                break
            self._switch_to_next_model()  # index = (index + 1) % total
    raise RuntimeError(f"all {models_tried} models failed")
```

When a model is switched, tools are re-bound to the new model instance:
```python
def _switch_to_next_model(self):
    self._llm = next_model_entry["llm"]
    if self._bound_tools:
        self._llm = self._llm.bind_tools(self._bound_tools)
```

**Key difference from BricksLLM** (from learnings): BricksLLM uses ordered Steps[] with independent per-step retries + backoff configured externally; this template uses a Python-level circular index + tenacity decorators. BricksLLM approach is more configurable at runtime; this template approach is simpler for single-language deployments.

**Nexus relevance:** Nexus has a single Gemini client with no fallback. The circular fallback pattern translates directly — Gemini 2.5 Flash → Gemini 1.5 Flash → Gemini 1.5 Pro on failure. Use tenacity instead of manual retry loops.

---

## Pattern 3: Human-in-the-Loop via `interrupt()` + graph state resume

**File:** `app/core/langgraph/tools/ask_human.py` + `app/core/langgraph/graph.py`

The tool:
```python
@tool
def ask_human(question: str) -> str:
    """Pause execution and ask the human a question before proceeding."""
    user_response = interrupt(question)
    return str(user_response)
```

`interrupt(question)` raises `GraphInterrupt` exception internally, which LangGraph catches and suspends the graph at the current node checkpoint. The graph state is persisted in PostgreSQL via `AsyncPostgresSaver`.

Resume logic in `get_response()`:
```python
state = await self._graph.aget_state(config)
if state.next:
    # Graph was previously interrupted
    response = await self._graph.ainvoke(
        Command(resume=messages[-1].content),  # user's reply resumes execution
        config=config,
    )
else:
    # Normal invocation path
    response = await self._graph.ainvoke(
        input={"messages": ..., "long_term_memory": ...},
        config=config,
    )

# After invocation, re-check for NEW interrupts
state = await self._graph.aget_state(config)
if state.next:
    interrupt_value = state.tasks[0].interrupts[0].value
    return [Message(role="assistant", content=str(interrupt_value))]
```

The same pattern is duplicated in `get_stream_response()`. Interrupt detection must happen BOTH before invoke (to detect prior unresolved interrupts) and after invoke (to detect interrupts that fired during this invocation).

**Nexus relevance:** This is exactly what Nexus does manually with RPA Computer Use — per-step confirmation buttons (Execute/Skip/Stop). The gotcha in Nexus was auto-executing AI-generated code (fixed 2026-04-09). LangGraph `interrupt()` provides the same pause/resume semantics but declaratively within the graph, without needing callback buttons or FSM state classes.

---

## Pattern 4: Two-tier memory — PostgreSQL checkpointer (short-term) + mem0/pgvector (long-term)

**Files:** `app/services/memory.py`, `app/core/langgraph/graph.py`

**Short-term (per-session, automatic):** `AsyncPostgresSaver` as LangGraph checkpointer. All messages for `thread_id` stored in `checkpoints`, `checkpoint_blobs`, `checkpoint_writes` tables. No code required beyond passing checkpointer to `compile()`. Clear via raw DELETE:
```python
for table in settings.CHECKPOINT_TABLES:
    await conn.execute(f"DELETE FROM {table} WHERE thread_id = %s", (session_id,))
```

**Long-term (cross-session, per-user):** `mem0` AsyncMemory with pgvector backend:
```python
class MemoryService:
    async def search(self, user_id, query) -> str:
        memory = await self._get_memory()
        results = await memory.search(user_id=str(user_id), query=query)
        return "\n".join([f"* {r['memory']}" for r in results["results"]])

    async def add(self, user_id, messages, metadata=None):
        await memory.add(messages, user_id=str(user_id), metadata=metadata)
```

Long-term memory retrieved BEFORE graph invocation, injected into `GraphState.long_term_memory`, included in system prompt:
```python
relevant_memory = await memory_service.search(user_id, messages[-1].content)
response = await self._graph.ainvoke(
    input={"messages": ..., "long_term_memory": relevant_memory},
    ...
)
```

Long-term memory updated AFTER response, as a fire-and-forget task:
```python
asyncio.create_task(
    memory_service.add(user_id, convert_to_openai_messages(response["messages"]), config["metadata"])
)
```

The `asyncio.create_task()` fire-and-forget pattern prevents memory writes from blocking the HTTP response. Risk: task failure is silent — only logged.

**Nexus relevance:** Nexus has `memory.py` + SQLite (WAL mode). The two-tier pattern is directly applicable: SQLite = short-term (already working), pgvector/mem0 = long-term cross-session recall. For a single-user Telegram bot, mem0 may be overkill — a simpler approach is a `global_context` table plus recent message summary stored back to SQLite.

---

## Pattern 5: ContextVar-based structured logging with per-request user context injection

**File:** `app/core/logging.py` + `app/core/middleware.py`

```python
_request_context: ContextVar[Dict[str, Any]] = ContextVar("request_context", default={})

def bind_context(**kwargs):
    current = _request_context.get()
    _request_context.set({**current, **kwargs})

def add_context_to_event_dict(logger, method_name, event_dict):
    context = get_context()
    if context:
        event_dict.update(context)
    return event_dict
```

`add_context_to_event_dict` is registered as a structlog processor — every log call automatically gets `user_id` and `session_id` injected without passing them explicitly:

```python
logger.info("llm_response_generated")
# → {"event": "llm_response_generated", "session_id": "abc", "user_id": 42, ...}
```

`LoggingContextMiddleware` sets context from JWT at request start, always clears in `finally`. Auth dependency (`get_current_session`) calls `bind_context(user_id=...)` when user resolves.

Log format switches by environment:
- `development`/`test`: `structlog.dev.ConsoleRenderer()` (colored, human-readable)
- `staging`/`production`: `structlog.processors.JSONRenderer()` (machine-readable)

Daily JSONL file handler: `logs/production-2026-04-12.jsonl` — simple rotation by date without external log rotation daemon.

**Nexus relevance:** Nexus currently uses Python stdlib logging. Replacing with structlog + ContextVar would give per-message `user_id` in all logs without threading. The ConsoleRenderer dev mode is especially useful for single-user bots (readable in terminal).

---

## Pattern 6: Langfuse LLM observability as a LangChain callback

**File:** `app/core/observability.py`, usage in `graph.py`

```python
langfuse_callback_handler = CallbackHandler()  # module-level singleton

# Passed in every graph invocation config:
config = {
    "configurable": {"thread_id": session_id},
    "callbacks": [langfuse_callback_handler],
    "metadata": {"user_id": user_id, "session_id": session_id, ...}
}
```

Because LangChain/LangGraph instruments all LLM calls via callbacks, a single `CallbackHandler` added to config captures: tokens, latency, model name, tool calls, prompts — all sent to Langfuse automatically. No manual instrumentation needed.

The eval pipeline (`evals/evaluator.py`) closes the loop: it fetches unscored traces from Langfuse (last 24h), runs LLM-as-judge against each metric, pushes numeric scores back:
```python
traces = langfuse.api.trace.list(from_timestamp=last_24_hours).data
traces_without_scores = [t for t in traces if not t.scores]
# For each trace: _call_openai(metric_prompt, input, output) → ScoreSchema
langfuse.create_score(trace_id=trace.id, name=metric_name, value=score.score)
```

**Nexus relevance:** Nexus has no observability beyond print/logging. Adding Langfuse CallbackHandler to Gemini calls via LangChain wrapper would provide instant visibility into which intents consume most tokens, which Gemini calls fail, etc.

---

## Pattern 7: Session-as-auth-token — JWT encodes session_id, not user_id

**Files:** `app/api/v1/auth.py`

Two-tier auth model:
1. `/register` + `/login` → JWT with `user_id` as `sub` — returns user token
2. `/session` (requires user token) → creates UUID session, returns JWT with `session_id` as `sub`

Chat endpoints use the session token, not the user token:
```python
async def get_current_session(credentials) -> Session:
    session_id = verify_token(token)           # decodes sub = session_id
    session = await db_service.get_session(session_id)  # DB lookup
    return session  # session.user_id available for memory lookup
```

This means each chat conversation is isolated at the token level — you can't replay session A's messages into session B even with the same user token. The LangGraph `thread_id` is set to `session.id`, tying the PostgreSQL checkpoint to the JWT's session claim.

---

## Gotchas found

**1. DatabaseService uses synchronous SQLAlchemy inside `async def` methods.** All DB calls use `with Session(self.engine)` (sync) inside `async def`. This blocks the event loop on every user/session lookup. Acceptable for low-concurrency use but will bottleneck under load. Should use `AsyncSession` + `asyncpg`.

**2. LLMRegistry instantiates all models at import time.** All 5 `ChatOpenAI(...)` objects are created when `llm.py` is imported — at module load, not on first use. If `OPENAI_API_KEY` is missing, the import fails. Cold start also initializes clients for models you'll never use.

**3. `process_llm_response` mutates the message object in-place.** `response.content = "".join(text_parts)` modifies the BaseMessage object returned by LangChain. This works but is side-effectful — if the same response is processed twice, the list is already a string and the loop produces wrong output.

**4. Fire-and-forget `asyncio.create_task` for memory writes has no error recovery.** Failed mem0 writes are only logged. For a production system tracking user preferences, silent drops are a real issue. Should use a background queue (pg-boss, BullMQ) or at minimum log the full exception with structured fields for alerting.

**5. `sanitize_string` uses `html.escape` on JWT tokens and session IDs.** The `&` in base64url-encoded tokens would be escaped to `&amp;`. This is a latent bug — current tokens don't contain `&` but the sanitization is conceptually wrong for non-HTML contexts. Should validate format (regex/length) without HTML-escaping opaque identifiers.

---

## Nexus.AI applicability summary

| Template pattern | Nexus current state | Adoption effort |
|---|---|---|
| LangGraph StateGraph for multi-step flows | Linear intent dispatch in `router.py` | High — requires rewriting handler dispatch |
| Circular LLM fallback (tenacity) | Single Gemini call, no retry | Low — wrap `analyze_intent()` + media calls |
| `interrupt()` for human confirmation | Manual FSM with callback buttons | Medium — replaces `VideoGenForm`, RPA confirm |
| Two-tier memory (checkpoint + vector) | SQLite only | High — needs pgvector or alternative |
| structlog + ContextVar | stdlib logging | Low — drop-in replacement |
| Langfuse observability | None | Low — single CallbackHandler addition |
| Session-as-JWT auth | Telegram user_id auth only | Not applicable (Telegram handles auth) |

Highest-value quick win for Nexus: **structlog + tenacity on Gemini calls**. The interrupt/checkpoint pattern would be the most architecturally transformative but requires the most work.

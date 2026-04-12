# Backend Expert — Learnings

> Auto-updated after each run.

---

## 2026-04-12
- R2R RAG: Multi-stage ingestion pipeline (PENDING→PARSING→CHUNKING→EMBEDDING→STORING→SUCCESS) — каждый шаг обновляет статус в БД. Повторная загрузка разрешена только из FAILED или SUCCESS (после DELETE). AsyncGenerator на каждом шаге позволяет стримить прогресс через SSE без буферизации документа.
- R2R RAG: Три стратегии поиска через единый `search()` диспетчер — "basic" (прямой embed+поиск), "hyde" (LLM генерирует гипотетические документы → embed их → parallel search → re-rank по оригиналу), "rag_fusion" (N sub-queries → basic search каждый → RRF fusion). Embedding вычисляется один раз и передаётся `precomputed_vector` во все дочерние вызовы.
- R2R RAG: Two-stage binary vector search — таблица хранит vec (FP32) и vec_binary (bit(N)). Stage 1: быстрый Hamming search, limit*20 кандидатов. Stage 2: CTE re-rank по оригинальным float векторам. Значительно быстрее при >100k записей.
- R2R RAG: FTS через GENERATED ALWAYS AS column — `fts tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED`. Автоматически обновляется при UPDATE text. GIN индекс создаётся на той же колонке. В hybrid search: semantic RRF score = 1/(k+rank), full-text RRF score = 1/(k+rank), финальный = weighted average.
- R2R RAG: MongoDB-style Filter DSL поверх PostgreSQL — `apply_filters({"$and": [{"owner_id": {"$eq": "..."}}, {"metadata.key": {"$in": [...]}}]})` генерирует параметрические SQL с позиционными плейсхолдерами. Разные builder-функции для UUID[], JSONB, standard columns. `ParamHelper` управляет нумерацией параметров для композиции с уже существующими (например, vector как $1).
- R2R RAG: Chunk Enrichment — LLM переписывает чанки добавляя контекст из N соседних чанков и document summary. Параллельный asyncio.gather батчами по 128. После enrichment: DELETE старых чанков документа → upsert новых. Оригинальный текст сохраняется в `metadata["original_text"]`.
- R2R RAG: `AsyncSyncMeta` metaclass автогенерирует sync-обёртки для `@syncable async def aget_*()` методов → `get_*()`. Sync wrapper запускает в Thread с собственным event loop. Паттерн для библиотек которые должны работать и в sync и async контексте.
- R2R RAG: `AggregateSearchResult` объединяет chunk/graph/web результаты в один тип. Все стратегии поиска возвращают его. `GraphSearchResult.chunk_ids` — traceback от KG-результата к исходным чанкам.
- fastapi-langgraph: LangGraph `Annotated[list, add_messages]` in GraphState is a reducer annotation — LangGraph calls the reducer to merge state updates instead of replacing the field. New messages appended; same-id messages updated in place. Not a regular list assignment.
- fastapi-langgraph: Two Postgres paths can coexist: `AsyncConnectionPool` (psycopg3) for `AsyncPostgresSaver` checkpointer + SQLAlchemy sync `QueuePool` for CRUD. Sync SQLAlchemy inside `async def` blocks the event loop — use `AsyncSession` under load.
- fastapi-langgraph: `interrupt(question)` in a LangGraph tool suspends graph at current checkpoint. Resume requires `Command(resume=user_reply)`. Must check `state.next` BOTH before invoke (prior unresolved interrupt) AND after invoke (new interrupt fired this run).
- fastapi-langgraph: `asyncio.create_task()` fire-and-forget for post-response memory writes avoids blocking HTTP response but failures drop silently. Use background queue for production reliability.
- fastapi-langgraph: LLMRegistry instantiates all models at import time — missing API key breaks the import. Prefer lazy init (first call) for optional/fallback models.
- fastapi-langgraph: ContextVar + structlog processor: bind user_id/session_id to ContextVar in middleware, register processor that reads ContextVar and injects into every log event. Zero explicit parameter passing across call stack.
- fastapi-langgraph: Session-as-auth-token: separate JWT for user (sub=user_id) vs per-conversation JWT (sub=session_id). Chat endpoints use only session token; user_id fetched from session DB row. Ties LangGraph thread_id to JWT claim.
- fastapi-langgraph: Langfuse tracing via LangChain callback: pass `CallbackHandler()` in `config["callbacks"]` on every `graph.ainvoke()`. All LLM calls, tool calls, tokens, latency captured automatically. Eval loop fetches unscored traces, runs LLM-as-judge, pushes scores back via `langfuse.create_score()`.
- speech-to-speech: Queue-connected handler chain — each pipeline stage (VAD/STT/LLM/TTS) runs in its own thread connected by threading.Queue. process() is a generator. b"END" sentinel propagates shutdown downstream. Parallel execution: TTS plays sentence 1 while LLM generates sentence 2.
- speech-to-speech: Generation counter cancellation (CancelScope) — monotonic int counter instead of bool flag. Handler captures `gen = scope.generation` at start, checks `scope.is_stale(gen)` per token/chunk. Counter wraps at 0xFFFFFFFF. Solves race where rapid user input leaves stale bool state.
- speech-to-speech: LLM sentence chunking for low-latency TTS — buffer tokens with NLTK sent_tokenize(), yield N-1 complete sentences, hold last incomplete. First TTS audio starts within ~1 sentence, not full response.
- speech-to-speech: TextIteratorStreamer timeout must be 1.0 not None — if generation thread crashes with None timeout, main thread blocks forever on streamer iteration.
- speech-to-speech: SESSION_END vs b"END" sentinel — SESSION_END = soft state reset (propagates downstream, thread survives, resets VAD buffer + chat history). b"END" = full shutdown. Enables client reconnection without reloading model-heavy threads.
- speech-to-speech: VAD deferred speech_started — emit only after buffer >= min_speech_ms (500ms default), not on first trigger. Eliminates false positives from brief noise.
- speech-to-speech: WebSocket audio buffering — accumulate min 100ms (3200 bytes @ 16kHz int16) before sending. asyncio.gather(*sends, return_exceptions=True) so one dropped client doesn't block others.
- speech-to-speech: Warmup ML models in setup() — dummy inference triggers JIT/CUDA kernel loading. First real request 3-5x slower without it.
- MiniMax-MCP: Chinese cloud APIs (MiniMax, Alibaba, Tencent) return HTTP 200 for business errors — actual error is in `base_resp.status_code` JSON field. Must do 2-layer check: HTTP status + JSON body. `status_code == 0` means success. Include `Trace-Id` response header in every error message for debugging.
- MiniMax-MCP: Dual resource mode pattern — single `RESOURCE_MODE=url|local` env var switches all media output between returning CDN URL vs downloading to disk. For cloud (Railway) always use URL mode to avoid ephemeral disk issues. Flip via env var, no code change.
- MiniMax-MCP: MiniMax TTS returns audio as hex-encoded bytes in JSON body (`data.audio` field) — not binary HTTP response, not base64. Decode with `bytes.fromhex(audio_hex)`. This is unusual; most TTS APIs return binary or base64.
- MiniMax-MCP: Async video generation 3-step pattern: POST submit → get `task_id`, GET poll `?task_id=X` until `status == "Success"` → get `file_id`, GET retrieve `?file_id=X` → get `download_url`. Three distinct endpoints. Premium model needs 20-minute timeout vs 10 minutes for standard.
- MiniMax-MCP: For multipart file upload with `requests.Session`, must `session.headers.pop('Content-Type', None)` before the upload call — `requests` auto-sets the correct `multipart/form-data; boundary=...` header only when Content-Type is absent. Leaving `application/json` in session headers breaks the boundary parsing.
- MiniMax-MCP: Cost-warning annotations in MCP tool descriptions — embed "COST WARNING: Only use when explicitly requested by the user" in every tool that incurs API cost. LLMs respect this in context and won't call expensive tools proactively.
- rss-parser: Parser instance must be reused across poll cycles — `this.etags` and `this.lastModified` maps are instance-level. Recreating `new Parser()` inside a cron tick loses all ETag cache. One instance at module load time.
- rss-parser: `parseURL()` resolves `null` (not empty feed) when server returns 304 Not Modified. Callers must guard: `if (feed === null) return []`. This is not an error.
- rss-parser: `defaultRSS: 2` option is required for feeds that omit `version=` attribute (common in non-English/regional feeds). Without it those feeds throw "Feed not recognized". Always set it.
- rss-parser: Default timeout is 60,000ms — way too long for bulk RSS polling. Set `timeout: 10000`-`15000` in constructor to fail fast and move to next feed.
- rss-parser: Multi-image fields like `media:content` require `keepArray: true` in customFields tuple — default behavior takes only first element. Format: `['media:content', 'media:content', {keepArray: true}]`.
- rss-parser: `item.contentSnippet` is already HTML-stripped + entity-decoded (via `entities` package) plain text — ready for direct injection into AI prompts. `item.content` retains raw HTML for image extraction.
- rss-parser: `url.resolve()` correctly handles relative redirects (`/new-location`) — no manual URL joining needed. Recursive redirect up to `maxRedirects` (default 5).
- BricksLLM: LLM gateway failover uses ordered Steps[] where each step has independent retries + backoff via `cenkalti/backoff/v4`. Step N exhaustion triggers step N+1 — not a global retry counter. OpenAI→Azure→Anthropic fallback is runtime-configurable with no code changes.
- BricksLLM: Strip client auth headers (Authorization, api-key) before forwarding to providers, then inject real provider key from internal settings. This is the essential security boundary — prevents key leakage through the gateway.
- BricksLLM: Redis HIncrBy with time-bucketed hash fields for rate limiting. Each time unit uses different bucket granularity (second=10ms buckets, minute=1s buckets, hour=1min buckets). TTL set via `ExpireAt` to end of current window. Reading = `HVals()` then sum all field values.
- BricksLLM: In-process message bus (pure Go buffered channels) decouples proxy hot path from DB event recording. Proxy publishes after response sent; consumer goroutine handles cost estimation + PostgreSQL insert asynchronously.
- BricksLLM: MemDb polling — load all records at startup, then `SELECT WHERE updated_at > $lastUpdated` every N seconds. Only changed rows applied. Single index on `updated_at` sufficient. No CDC/webhooks needed.
- BricksLLM: Per-step request decoration rewrites model field + params (temperature, max_tokens) per step before forwarding. Client sends one generic request; gateway handles provider-specific transformations.
- BricksLLM: Policy scan runs AWS Comprehend + custom LLM detector concurrently (sync.WaitGroup), then regex sequentially after. Graduated actions: Block > AllowButWarn > AllowButRedact > Allow. Redact replaces entity spans with "***" using character offsets from Comprehend.
- BricksLLM: Timeout middleware MUST run before auth middleware — auth creates per-request contexts using `c.GetDuration("requestTimeout")` set by timeout middleware. Wrong Gin middleware order = nil duration context.
- DBOS Transact: durable workflow = decorator + PostgreSQL. `@DBOS.workflow()` persists args on start; `@DBOS.step()` checks `operation_outputs(workflow_uuid, function_id)` before executing — if row exists, returns stored value. Crash recovery = re-run from last persisted step, no duplicate side effects.
- DBOS Transact: `function_id` is a per-workflow sequential counter (not a UUID). Step 1 is always function_id=1, step 2 is function_id=2, etc. If on recovery a different function name is found at the same function_id, `DBOSUnexpectedStepError` fires — this is the non-determinism detector.
- DBOS Transact: `DBOSWorkflowCancelledError` inherits from `BaseException` (not `Exception`) — intentionally uncatchable by user `except Exception` blocks inside workflow steps. Always use `except Exception` in step bodies, never `except BaseException`.
- DBOS Transact: `SetWorkflowID("my-idempotency-key")` context manager makes any workflow call idempotent — second call with same ID returns stored result without re-executing. Perfect for HTTP webhook handlers.
- DBOS Transact: app version is MD5 of all workflow source code + dbos version. New deploy with changed workflow code = new version = old in-flight workflows NOT recovered by new process. Plan for workflow migration on deploys.
- DBOS Transact: PostgreSQL advisory lock `pg_try_advisory_lock(1234567890)` serializes concurrent migrations — safe for multiple Railway instances starting simultaneously.
- DBOS Transact: `@DBOS.transaction()` records result INSIDE the user's own DB transaction (atomic with user's DB changes). `@DBOS.step()` records result AFTER — steps should be idempotent, transactions do not need to be.
- DBOS Transact: queue deduplication via unique constraint on `(queue_name, deduplication_id)`. On workflow completion, `deduplication_id` is set to NULL, allowing future re-enqueue of same ID.
- DBOS Transact: `Outcome` protocol (Immediate/Pending) is a lazy monad for composing sync+async execution with context managers. `.intercept()` = replay gate, `.then()` = post-execution hook, `.also()` = context manager wrapper. The whole pipeline builds lazily, then `outcome()` fires it.
- DBOS Transact: `owner_xid` UUID per execution attempt prevents concurrent double-execution without distributed locks. If owner_xid in DB doesn't match current process, the process becomes a waiter via `await_workflow_result()`.
- markitdown: Priority-based converter chain with graceful degradation — lower priority value = tried first, failures accumulated across all converters, `FileConversionException` only raised if EVERY accepting converter fails. File stream position must be reset in `finally` after every attempt.
- markitdown: Optional dependency pattern — import at module level, catch ImportError, store `sys.exc_info()` in module-level variable. Raise `MissingDependencyException` lazily inside `convert()` only when called. Library loads without any optional deps; errors surface with exact pip install commands.
- markitdown: Plugin priority injection — plugins register converters at `priority=-1.0` to run before built-ins at `0.0`, effectively replacing them. No core code changes needed. Plugin failures are warned, not raised.
- markitdown: HTML as universal intermediate for structured formats — DOCX/XLSX/PPTX/EPUB all convert to HTML first, then share one `markdownify` pipeline. Tables, headings, links normalized once.
- markitdown: Frozen immutable context object with `copy_and_update()` — `StreamInfo` is a frozen dataclass; layering metadata from multiple sources (extension, HTTP headers, magika) never overwrites non-None values.
- markitdown: PDF borderless table detection via word position clustering — group words by Y, cluster X positions with adaptive 70th-percentile tolerance, classify rows as table/prose by column alignment, require 20%+ table rows before emitting. Works without visible borders.
- markitdown: Per-page `page.close()` after pdfplumber processing keeps memory constant regardless of PDF length — critical for long document batches.
- markitdown: Deep content check in `accepts()` — if MIME is ambiguous (e.g., `application/json` could be a notebook), read the stream and check for marker strings, then reset position. `convert()` will be called immediately after so the position contract is critical.
- llm-gateway: JSON-externalized provider registry with lazy `importlib.import_module()` avoids loading unused LLM SDKs — critical for container cold start when only one provider is configured.
- llm-gateway: Separate `RateLimitError` subclass enables 3-way retry logic in one loop: rate-limited (retry with backoff), transient keyword match (retry), 4xx client error (fail immediately). No nested if/else.
- llm-gateway: Tool argument parsing needs 3-pass fallback: direct json.loads → strip markdown fences → strip trailing commas → `{"_parse_error": raw}` sentinel. Sentinel keeps the call alive; downstream tool detects and handles.
- llm-gateway: Use OpenAI format as canonical for tool calls across all providers. Each provider gets one translation layer (OpenAI → provider), not N*M translations between providers.
- llm-gateway: Anthropic tool results MUST be grouped into a single `user` role message. Pattern: buffer them in `tool_result_buffer`, call `flush_tool_results()` before every non-tool message.
- llm-gateway: Ollama does NOT generate tool call IDs — must synthesize: `f"call_{uuid.uuid4().hex[:24]}"`.
- llm-gateway: FastAPI `deprecated=True` on `app.add_api_route()` marks old routes in OpenAPI schema (strikethrough in Swagger UI) without removing them. Clean migration path: new routes under `/api/v1.0/`, old routes kept but marked deprecated.
- llm-gateway: LLM cost tracking — store in microcents (int), not dollars (float). `round((tokens/1000) * price_per_1k)`. Avoids float accumulation errors when aggregating thousands of calls.
- meta-extractor: got.stream() bypasses got's built-in retry — the `retry: {}` option has no effect in streaming mode. Always wrap extract() calls in p-retry externally.
- meta-extractor: `this.resume()` must be called on a Transform stream to drain the socket after early exit (limit exceeded or binary detected) — without it the TCP connection hangs open.
- meta-extractor: result `res.images` is a `Set`, not an array, and is `undefined` (not empty Set) when no images found — always guard with `res.images ? [...res.images] : []` before serializing.
- meta-extractor: regex-driven meta tag filtering (`rxMeta` option) is more flexible than a static allowlist — a single regex covers OG, Twitter, VK, App Links simultaneously and callers can override it.
- meta-extractor: RSS/Atom feed auto-discovery via `<link rel="alternate" type="application/rss+xml">` — useful for expanding News.AI Parser to new niches without manually hunting RSS URLs.
- supabase-js PostgrestBuilder built-in retry works ONLY for GET/HEAD/OPTIONS (idempotent methods) — status codes 503 and 520. INSERT/UPDATE/DELETE never auto-retry. For critical write operations use p-retry externally.
- supabase-js maybeSingle() works client-side: PostgREST returns an array, SDK converts to object/null in processResponse() — zero extra network overhead vs .single().
- supabase-js auto-refresh ticker calls .unref() in Node.js to prevent the setInterval from blocking process exit during tests or graceful shutdown.
- supabase-js Realtime channel.subscribe() auto-calls connect() if the WebSocket is not open — no need to manually call client.connect() first.
- supabase-js `functions` property is a getter that creates a new FunctionsClient on every access — this is intentional since FunctionsClient is stateless.
- supabase-js GLOBAL_JWKS cache is shared across all createClient() calls with the same storageKey — critical for serverless environments with asymmetric JWT to avoid repeated JWKS fetches.
- supabase-js BroadcastChannel syncs auth session state between browser tabs automatically with no configuration — important for multi-tab dashboard applications.
- supabase-js accessToken option (third-party auth) completely blocks supabase.auth via a Proxy that throws on any property access — intentional design to prevent auth mixing.
- supabase-js fetchWithAuth wrapper fetches a fresh JWT on EVERY request via getAccessToken() — this means auth.getSession() is called per-request; in Node.js this is a memory lookup not a network call.
- supabase-js _callRefreshToken uses a Deferred pattern to deduplicate concurrent refresh attempts — multiple callers waiting for refresh all receive the same Promise result.
- supabase-js .in() with large arrays (200+ IDs) can hit URL length limits (default 8000 chars) causing AbortError — use .rpc() to pass large arrays server-side instead.
- supabase-js processLock (Node.js/React Native) implements exclusive locking via Promise chaining — PROCESS_LOCKS[name] stores the last operation's promise, new operations await it before running.

## 2026-04-10
- Per-channel credential resolution pattern: store `ig_user_id`/`ig_access_token` on a channel_profiles row; the publisher fetches them via a dedicated `/credentials` endpoint before the batch, then passes a `creds` object through the call chain (`graphRequest`, `getMediaInfo`, etc.) with `resolveCredentials(creds)` falling back to env vars when null. One Brain query per publish batch, not per article.
- `maybeSingle()` in Supabase JS SDK returns `null` in `.data` when no row is found — use it instead of `.single()` which throws on missing rows.
- Dual-backend pattern (Supabase prod / SQLite local fallback) via `_use_supabase()` flag keeps the same public API for both backends — callers are backend-agnostic.
- Supabase Python SDK `.delete()` requires at least one filter; use `.gt("id", 0)` as a safe "delete all rows" workaround when no WHERE clause is needed (e.g. `clear_global_context`).
- `maybe_single()` in supabase-py returns `None` in `.data` when no row is found — cleaner than `.single()` which raises on missing rows.

## 2026-04-09
- RSS parser libraries often implement HTTP caching with ETags and If-Modified-Since headers to avoid re-parsing unchanged feeds.

## 2026-04-09
- Field mapping systems using configuration objects can make parsers flexible for different XML/RSS formats while keeping code DRY.

## 2026-04-09
- Abstract handler base classes with setup/process/cleanup lifecycle methods provide excellent modularity for pipeline-based systems.

## 2026-04-09
- Thread-safe queue flushing with selective item preservation (using preserve callbacks) enables graceful state management during cancellation scenarios.

## 2026-04-09
- Migration race condition protection using assert statements with specific error message checks provides robust handling of concurrent schema updates.

## 2026-04-09
- EventEmitter-based warning systems with configurable thresholds and persistence options create excellent observability for production systems.

## 2026-04-09
- Using private fields (#field) in TypeScript classes provides true encapsulation and cleaner API surfaces compared to private keyword.

## 2026-04-09
- Configuration-driven provider registries with JSON externalization enable flexible multi-service backends without code changes.

## 2026-04-09
- Auto-fallback service chains that collect and aggregate errors from multiple providers provide excellent resilience for external API dependencies.

## 2026-04-09
- Tracking costs in microcents instead of dollars avoids floating-point precision issues in financial calculations.

## 2026-04-09
- Resilient JSON parsing with multiple fallback strategies (markdown fence removal, trailing comma cleanup) handles common LLM response formatting inconsistencies.

## 2026-04-09
- ML libraries often use __all__ exports with explicit lists to create clean public APIs, which can be applied to any Python package design.

## 2026-04-09
- Wildcard imports with noqa comments in __init__.py files can indicate complex module structures but should be used carefully to avoid namespace pollution.

## 2026-04-09
- Migration race condition protection using assert statements with specific error message checks provides robust handling of concurrent schema updates.

## 2026-04-09
- EventEmitter-based warning systems with configurable thresholds and persistence options create excellent observability for production systems.

## 2026-04-09
- Using private fields (#field) in TypeScript classes provides true encapsulation and cleaner API surfaces compared to private keyword.

## 2026-04-09
- Bun's serve() function with custom fetch handlers provides a lightweight alternative to Express for simple API servers.

## 2026-04-09
- Dynamic CORS origin validation using both allowlists and pattern matching (isLocalDomain) enables flexible development while maintaining security.

## 2026-04-09
- R2 (Cloudflare's S3-compatible storage) integration follows standard AWS SDK patterns and can be easily adapted for file serving workflows.

## 2026-04-09
- Temporary file management with automatic cleanup in finally blocks is crucial for file processing workflows to prevent disk space leaks.

## 2026-04-09
- Multi-source API key extraction checking Authorization Bearer, x-api-key, and api-key headers provides excellent compatibility across different client implementations.

## 2026-04-09
- Provider-specific header rewriting based on URL prefixes enables a single authentication layer to handle multiple API providers with different auth requirements.

## 2026-04-09
- Cache + storage fallback pattern (keysCache interface + keyStorage interface) provides performance with reliability for authentication systems.

## 2026-04-09
- Action-based policy systems (Block/AllowButWarn/AllowButRedact/Allow) create flexible content filtering that can be configured per use case.

## 2026-04-09
- Field mapping systems using [source, destination, options] tuple arrays provide flexible data transformation while maintaining readability.

## 2026-04-09
- HTTP caching in libraries can be implemented by storing ETags and Last-Modified headers in instance variables keyed by URL.

## 2026-04-09
- Supporting both callback and Promise APIs simultaneously with a maybePromisify wrapper function maintains backward compatibility while enabling modern async/await usage.

## 2026-04-09
- Dynamic Content-Type header management that removes the header for multipart uploads and sets it for JSON requests prevents common file upload issues.

## 2026-04-09
- Cross-platform config directory detection using sys.platform with fallback paths (AppData/Roaming on Windows, Library/Application Support on macOS, XDG_CONFIG_HOME on Linux) enables universal desktop app configuration.

## 2026-04-09
- API error code matching with specific exception types and trace ID inclusion creates excellent debugging experience for external API integrations.

## 2026-04-09
- Cost warning patterns in tool descriptions help prevent accidental expensive API usage in AI/LLM integrations.

## 2026-04-09
- Settings.set_auto_reload(False/True) pattern allows safe configuration updates during initialization by temporarily disabling file watchers.

## 2026-04-09
- Click's main.add_command() pattern enables modular CLI design where subcommands can be imported from separate modules and attached dynamically.

## 2026-04-09
- Conditional directory operations with dirs_exist_ok=True combined with path comparison checks prevent unnecessary file copying while ensuring required directories exist.

## 2026-04-09
- CancelScope pattern enables cooperative cancellation across multiple async operations by checking is_stale status rather than forcing thread termination.

## 2026-04-09
- Queue flushing with selective preservation using callable filters (_flush_queue with preserve parameter) allows atomic cleanup while maintaining important state.

## 2026-04-09
- Atomic queue operations using queue.mutex with appendleft and manual notification provides thread-safe priority insertion for preserved items.

## 2026-04-09
- Pydantic models as mutable streaming accumulators (StreamContext) provide type-safe state tracking through generator lifecycles.

## 2026-04-09
- Optional dependency management with try/except imports combined with HAS_FEATURE flags enables graceful feature degradation.

## 2026-04-09
- Config file cascading with multiple filename attempts (pgboss.json, .pgbossrc, .pgbossrc.json) provides flexible configuration discovery for CLI tools.

## 2026-04-09
- Performance monitoring with configurable thresholds (WARNINGS.SLOW_QUERY.seconds) combined with automatic warning emission creates proactive observability.

## 2026-04-09
- Private field syntax (#field) in TypeScript provides true encapsulation and cleaner class interfaces compared to traditional private keywords.

## 2026-04-09
- Supervision interval patterns with graceful shutdown (waiting for #maintaining state) ensure clean resource cleanup in long-running processes.

## 2026-04-09
- Bun's native HTTP server with manual URL pattern matching can be an alternative to Express for simple APIs, avoiding framework overhead.

## 2026-04-09
- CORS origin validation combining static allowed origins with dynamic local domain detection (isLocalDomain) provides flexible development/production security.

## 2026-04-09
- Cloudflare R2 can be accessed using AWS SDK by setting a custom endpoint, providing S3-compatible object storage.

## 2026-04-09
- Temporary project creation with guaranteed cleanup in finally blocks is essential for file processing APIs that create filesystem artifacts.

## 2026-04-09
- Message object extension pattern (attaching reply/react/download methods to message instances) provides clean API for chat bot interactions.

## 2026-04-09
- WhatsApp bot architecture with automatic reconnection and session persistence shows resilient long-running process patterns for real-time messaging.

## 2026-04-09
- Command parsing with prefix detection and argument splitting is a common pattern in chat bots that could apply to slash command APIs.

## 2026-04-09
- WhatsApp bot session management using multi-file auth state with environment variable restoration provides resilient authentication for messaging bots.

## 2026-04-09
- Plugin architecture with regex command matching and standardized execute() methods enables modular command handling in chat applications.

## 2026-04-09
- Message serialization layers that normalize different message formats (text, media, interactive responses) into consistent objects simplify bot logic.

## 2026-04-09
- Dual callback/promise APIs using a maybePromisify utility function enables backward compatibility while supporting modern async patterns.

## 2026-04-09
- Field mapping systems using array configurations with [source, dest, options] tuples provide flexible data transformation for XML/API parsing.

## 2026-04-09
- HTTP caching implementation storing ETags and Last-Modified headers in class instance properties enables efficient feed polling with conditional requests.

## 2026-04-09
- CLI initialization patterns with settings auto-reload toggles (development vs production) provide clean configuration management for complex applications.

## 2026-04-09
- Click command grouping with separate imported commands (main.add_command(startup_main, "start")) enables modular CLI architecture.

## 2026-04-09
- Conditional feature initialization based on flags (recreate_kb) with different success messages guides users through multi-step setup processes.

## 2026-04-09
- Rate limiting decorators combined with availability checks (@available(rate_limit)) provide clean middleware-like functionality for bot command handlers.

## 2026-04-09
- Context dictionary persistence across handler invocations enables stateful conversation management in event-driven systems.

## 2026-04-09
- Chainable handler methods that return self enable conversation flow continuation while maintaining clean separation of concerns.

## 2026-04-09
- React Query hook factory pattern with config spreading (...config, queryKey, queryFn) provides consistent API client architecture across features.

## 2026-04-09
- Query key versioning with arrays like ['ad', 'v2', keywords] enables cache invalidation strategies and API evolution tracking.

## 2026-04-09
- Firebase Auth integration with custom logout flows that clear multiple stores and trigger analytics demonstrates multi-system state management patterns.

## 2026-04-09
- Shared package architecture with barrel exports enables type and utility sharing across monorepo packages while maintaining clean feature boundaries.

## 2026-04-09
- Fern API schema definitions provide automatic OpenAPI spec generation and client SDK generation from YAML specifications.

## 2026-04-09
- Event envelope pattern for batch ingestion separates event metadata (id, timestamp, type) from trace body data, enabling deduplication and proper event handling.

## 2026-04-09
- Status code 207 (Multi-Status) for batch operations allows partial success responses with detailed error reporting per item.

## 2026-04-09
- MCP (Model Context Protocol) tool decorators provide a clean way to expose backend functions as standardized tools with automatic parameter validation and documentation.

## 2026-04-09
- Message context patterns that fetch surrounding messages (before/after) for search results provide better conversational understanding in chat applications.

## 2026-04-09
- Composite primary keys (id, chat_jid) enable message deduplication across multiple chat contexts while maintaining referential integrity.

## 2026-04-09
- Pydantic BaseSettings with field aliases enables clean environment variable mapping while maintaining descriptive internal property names.

## 2026-04-09
- Conditional service wrapping based on configuration values (cache_size > 0) provides clean feature toggle implementation without complex branching.

## 2026-04-09
- Custom OpenTelemetry exporters can redirect metrics to logging systems instead of console output for better production observability integration.

## 2026-04-09
- Settings validation with automatic value normalization (adding s3:// prefix, removing trailing slashes) ensures consistent configuration regardless of input format.

## 2026-04-09
- Automated database type generation with `supabase gen types` into shared packages enables type-safe database access across monorepo applications.

## 2026-04-09
- Supabase CLI commands for local development (start/stop/reset/push) provide a complete local-to-production development workflow without custom server setup.

## 2026-04-09
- cachedEventHandler with maxAge configuration provides automatic response caching at the handler level without external cache dependencies.

## 2026-04-09
- Mapper functions that transform CMS entities to consistent API responses enable clean separation between internal data structure and public API contracts.

## 2026-04-09
- Webhook event filtering with predefined relevantEvents arrays prevents unnecessary processing of unhandled webhook types.

## 2026-04-09
- Centralized SDK configuration with environment-based tokens (staticToken) provides clean authentication setup for headless CMS integration.

## 2026-04-09
- serializeError library enables consistent error logging across async boundaries by converting error objects to JSON-serializable format.

## 2026-04-09
- isOperationalError classification pattern distinguishes between expected business logic errors and unexpected system errors for proper error handling decisions.

## 2026-04-09
- migrate-mongo provides TypeScript migration support with file hash validation and structured changelog tracking for MongoDB schema evolution.

## 2026-04-09
- OpenTelemetry host metrics collection with MeterProvider and custom readers enables production-grade observability in Node.js applications.

## 2026-04-09
- Cross-platform browser executable detection using platform-specific executable names, default installation paths, and process pattern matching enables robust browser launching across operating systems.

## 2026-04-09
- Process spawning with detached mode and unref() allows parent processes to exit independently while keeping child processes (like browsers) running, useful for CLI tools that launch long-running services.

## 2026-04-09
- Multiple search engine integration (FlexSearch for full-text, NDX for document indexing, Fuzzy for approximate matching) provides comprehensive search capabilities for different query types and use cases.

## 2026-04-10
- Validation with error accumulation (collecting all validation errors in an array before reporting) provides better developer experience than failing on first error.

## 2026-04-10
- Transformation caching with composite cache keys enables efficient reprocessing of expensive operations like file parsing and AST analysis.

## 2026-04-10
- TypeScript AST parsing with ts-morph library provides more reliable code analysis than regex-based parsing for import/dependency extraction.

## 2026-04-10
- Adapter pattern with platform-specific worker class extensions enables consistent API across multiple integrations while providing specialized functionality per platform.

## 2026-04-10
- Multi-tenancy support through callback functions (like getAccessTokenForPage) provides flexible token management without hardcoding credentials in the adapter configuration.

## 2026-04-10
- Namespaced debug logging with platform-specific loggers (botkit:slack, botkit:facebook) enables granular debugging control across different service integrations.

## 2026-04-10
- Stream-based HTML parsing with early binary file detection prevents unnecessary processing and memory issues when scraping unknown URL content types.

## 2026-04-10
- Configurable response size limits in stream transforms provide protection against memory exhaustion from large responses while maintaining processing flexibility.

## 2026-04-10
- Error transformation pattern that converts library-specific errors (like got.HTTPError) to standard Error objects with preserved metadata enables cleaner error handling across application boundaries.

## 2026-04-10
- Two-pass tree building pattern (first pass creates all nodes in Map, second pass establishes parent-child relationships) prevents ordering dependencies when constructing hierarchical data structures.

## 2026-04-10
- Generic adapter interfaces with SpanAdapter<TDocument, TSpan> enable consistent APIs across different telemetry formats while maintaining type safety for format-specific operations.

## 2026-04-10
- Nano-timestamp conversion utilities and percentage-based timeline calculations are essential patterns for telemetry visualization and time-series data processing.

## 2026-04-10
- Retry decorators with specific exception targeting (stamina.retry on ValidationError only) provide more precise failure recovery than blanket retry logic.

## 2026-04-10
- Stream response validation pattern that accumulates chunks and validates the final complete response enables real-time streaming with schema guarantees.

## 2026-04-10
- Namespaced logger creation using class name (f"ollama_instructor.{self.__class__.__name__}") provides better debugging granularity in library code.

## 2026-04-10
- Async context managers with automatic resource cleanup (`async with Sandbox.ephemeral()`) provide excellent patterns for managing ephemeral compute resources like VMs or containers.

## 2026-04-10
- Sequential connection phase followed by concurrent execution phase improves debugging experience while maintaining performance for batch operations.

## 2026-04-10
- Fluent API design with method chaining (Image.android().apk_install()) creates intuitive configuration interfaces for complex resource provisioning.

## 2026-04-10
- Multi-provider database abstraction using Enum types enables type-safe database driver selection while maintaining consistent interfaces across different backend implementations.

## 2026-04-10
- Environment variable configuration with fallback defaults for database index names provides deployment flexibility while maintaining sensible development defaults.

## 2026-04-10
- TYPE_CHECKING conditional imports prevent circular dependencies and improve startup performance by only importing type annotations during static analysis.

## 2026-04-10
- Generic type constraints with default fallbacks (UserConfig extends Config = Config) enable flexible APIs while maintaining type safety and backwards compatibility.

## 2026-04-10
- Progress tracking pattern using optional callback functions (onResolveStart/onResolveEnd) provides clean observability hooks without coupling core logic to monitoring concerns.

## 2026-04-10
- Concurrent async processing with Promise.all for independent operations (resolving slots and zones separately) maximizes performance in tree-walking data transformation scenarios.

## 2026-04-10
- WhatsApp bot architecture using Baileys library demonstrates event-driven message processing with command parsing patterns that could inspire chat-like features in web applications.

## 2026-04-10
- Session persistence pattern using periodic file writes (setInterval + writeToFile) provides simple durability for stateful applications without database complexity.

## 2026-04-10
- Message serialization with method chaining (m.reply, m.react, m.download) creates intuitive APIs for interactive messaging systems.

## 2026-04-10
- Tracing instrumentation with selective parameter skipping (#[tracing::instrument(skip(state))]) provides comprehensive observability while protecting sensitive data from logs.

## 2026-04-10
- CancellationToken pattern enables coordinated graceful shutdown across multiple async components (server, UI, background tasks).

## 2026-04-10
- Cross-platform path resolution that matches framework conventions (following Tauri's desktop path approach) ensures consistent user experience across operating systems.

## 2026-04-10
- OTP-based device registration with hashed auth keys provides a secure alternative to traditional session-based authentication for desktop applications.

## 2026-04-10
- Entity mapping with URL pattern replacement (`:slug`, `:id`) provides a clean way to generate frontend routes from backend data structures.

## 2026-04-10
- Directus SDK with typed schemas offers a CMS-agnostic backend pattern that could be adapted for other headless CMS integrations alongside Supabase.

## 2026-04-10
- Stripe webhook event filtering using a `relevantEvents` array prevents unnecessary processing and improves webhook handler performance.

## 2026-04-10
- Environment variable interpolation with default values using ${VAR:default} syntax in YAML configs provides flexible deployment configuration without breaking local development.

## 2026-04-10
- Resource manager pattern that centralizes access to all application resources (tools, auth, embeddings) through a single interface simplifies dependency management and testing.

## 2026-04-10
- Dual serving modes (stdio for protocol clients, HTTP for web UI) in the same application enables both programmatic and human interfaces without code duplication.

## 2026-04-10
- Handler pattern using template literal types for routing (`${urlType}::${owner}/${repo}`) enables type-safe, hierarchical handler selection with automatic fallbacks.

## 2026-04-10
- MCP (Model Context Protocol) tool pattern with Zod schema validation and callback structure provides a clean interface for AI-consumable APIs.

## 2026-04-10
- Rate limiting pattern that tracks GitHub API headers (x-ratelimit-remaining, x-ratelimit-reset) and implements automatic delays prevents API quota exhaustion.

## 2026-04-10
- Global singleton pattern with lazy initialization using a getter function provides thread-safe access while deferring expensive object creation until needed.

## 2026-04-10
- TYPE_CHECKING import guards enable comprehensive type hints while avoiding circular dependencies and runtime import costs.

## 2026-04-10
- Protocol-based architecture allows for extensible plugin systems where components implement specific interfaces without tight coupling to concrete classes.

## 2026-04-10
- Bundled SQLite reference databases in packages can provide offline lookup capabilities, but require secure query building to avoid SQL injection.

## 2026-04-10
- String formatting SQL queries (`.format()`) creates SQL injection vulnerabilities - parameterized queries or ORMs should always be used instead.

## 2026-04-10
- Reducer pattern with immutable state updates and typed actions provides a scalable approach for managing complex component state that could be adapted for frontend state management in full-stack applications.

## 2026-04-10
- Theme inheritance using deep merge allows for flexible customization while maintaining base theme defaults, a pattern applicable to any configuration system.

## 2026-04-10
- CLI-based server startup with cobra command structure and daemon mode support provides a professional deployment pattern for self-hosted applications.

## 2026-04-10
- Background service initialization pattern (queue, cleanup, WebSocket server) before HTTP server start ensures all dependencies are ready before accepting requests.

## 2026-04-10
- Pipe-delimited SQL file execution for installation/migration shows a simple approach to schema setup, though parameterized queries would be safer.

## 2026-04-10
- Environment-specific .env file loading with priority fallback (.env.{env}.local → .env.{env} → .env.local → .env) provides flexible configuration management across deployment environments.

## 2026-04-10
- Structured logging with contextual field parameters instead of string interpolation enables better log aggregation and filtering in production monitoring.

## 2026-04-10
- Custom FastAPI validation exception handler can transform Pydantic validation errors into user-friendly API responses while maintaining detailed server-side logging.

## 2026-04-10
- AsyncContextManager lifespan pattern in FastAPI provides clean application startup/shutdown hooks for resource initialization and cleanup.

## 2026-04-10
- Rate limiting per endpoint with configurable limits dictionary allows fine-grained control over API usage patterns without hardcoding limits.

## 2026-04-10
- Zod schema validation with transform functions for boolean strings enables flexible AI output parsing while maintaining type safety.

## 2026-04-10
- Security guardrails system with threat detection, content sanitization, and strictness modes provides a robust defense against prompt injection and sensitive data exposure.

## 2026-04-10
- Agent-based architecture with context objects, event managers, and message history provides a scalable pattern for complex AI workflows that could be adapted for API-based AI services.

## 2026-04-10
- Action builder pattern with schema-driven validation allows for dynamic tool registration while maintaining type safety and input validation.

## 2026-04-10
- Modular client SDK architecture with domain-separated sub-clients (users, documents, conversations) provides clean separation of concerns and better maintainability than monolithic API clients.

## 2026-04-10
- Automatic JWT refresh with callback hooks for token persistence allows SDKs to handle auth transparently while letting applications control how tokens are stored (localStorage, cookies, etc.).

## 2026-04-10
- Environment-aware conditional imports using `typeof window === "undefined"` enables universal TypeScript packages that work in both Node.js and browser environments.

## 2026-04-10
- Protocol-based architecture with abstract base classes enables extensible plugin systems while maintaining type safety and clear contracts.

## 2026-04-10
- Lazy singleton initialization with global state and None checks provides clean API surface while deferring expensive object creation until needed.

## 2026-04-10
- TYPE_CHECKING conditional imports solve circular dependency issues in complex Python codebases without runtime overhead.

## 2026-04-10
- NamedTuple for immutable data containers provides better performance and safety than regular tuples while maintaining structural typing benefits.

## 2026-04-10
- Structured result dataclasses with optional error fields provide a clean alternative to exception-based error handling for service layer responses.

## 2026-04-10
- Multiple transport layer support (STDIO, SSE, HTTP) in a single server codebase enables flexible deployment options without code duplication.

## 2026-04-10
- MCP (Model Context Protocol) framework pattern shows how to build AI tool servers with standardized interfaces for LLM integration.

## 2026-04-11
- Builder pattern with dependency-injected specialized classes (MetadataLoader, FileScanner, DependencyExtractor) provides excellent separation of concerns for complex data processing pipelines.

## 2026-04-11
- Transformation cache with composite keys enables efficient content processing for registry/component systems that could be adapted for API response transformation.

## 2026-04-11
- Error accumulation pattern that collects all validation errors before throwing provides better developer experience than failing on first error.

## 2026-04-11
- Publisher service pattern with platform-specific controllers returning structured {status, message, platform_post_id} responses provides clean abstraction for multi-platform posting APIs.

## 2026-04-11
- Beanie ODM field validators with @classmethod decorators enable automatic data transformation (lowercase, timezone conversion) at the model level, reducing boilerplate in route handlers.

## 2026-04-11
- TimestampMixin with @before_event decorators in Beanie provides automatic timestamp management without manual intervention in business logic.

## 2026-04-11
- API grouping pattern using object composition in constructors (this.mfa = { listFactors: this._listFactors.bind(this) }) provides clean namespace organization while maintaining proper `this` binding.

## 2026-04-11
- Comprehensive error taxonomy with specific error classes for each failure mode (AuthPKCECodeVerifierMissingError, AuthInvalidJwtError, etc.) provides better debugging experience than generic error messages.

## 2026-04-11
- Modular client SDK with domain-separated classes (GoTrueClient for auth, RealtimeClient for WebSockets, PostgrestClient for database) enables tree-shaking and clear separation of concerns in client applications.

## 2026-04-11
- ContextVar-based request context isolation enables clean state management across async operations without manual context passing through function parameters.

## 2026-04-11
- Abstract factory pattern with database-specific implementations (PostgresApplicationDatabase, SQLiteApplicationDatabase) provides seamless multi-database support while maintaining unified interface.

## 2026-04-11
- Outcome pattern with explicit Pending/NoResult states provides better control flow than exceptions for workflow orchestration systems where intermediate states matter.

## 2026-04-11
- Custom exception hierarchies with specific error classes (DBOSMaxStepRetriesExceeded, DBOSWorkflowConflictIDError) enable precise error handling and better debugging experience than generic exceptions.

## 2026-04-12 (pg-boss)
- pg-boss uses `FOR UPDATE SKIP LOCKED` as its entire concurrency primitive — multiple workers on multiple nodes poll the same Postgres table safely, no Redis needed.
- pg-boss retry + DLQ are a single 3-CTE SQL transaction: deleted_jobs → retried_jobs → failed_jobs → dlq_jobs. Atomically decides retry vs permanent fail vs dead letter copy.
- pg-boss exponential backoff formula: `retryDelay * (2^min(16,retryCount)/2 + 2^min(16,retryCount)/2 * random())`. The `random()` is jitter to prevent retry storms.
- pg-boss cron uses `singletonSeconds: 60` on an internal `__pgboss__send-it` queue — prevents duplicate cron fires when multiple nodes check the schedule simultaneously.
- pg-boss advisory locks (`pg_advisory_xact_lock` keyed by sha224 of database+schema+key) protect schema creation and migrations — safe for concurrent multi-node startup.
- pg-boss migration race is caught by intentional SQL: `SELECT version::int / (version::int - $target)` — raises 'division by zero' if already migrated. Application catches that specific error and ignores it.
- All 6 pg-boss queue policies (standard/short/singleton/stately/exclusive/key_strict_fifo) are enforced by partial unique indexes only — no application-layer enforcement overhead.
- pg-boss `localGroupConcurrency` is in-memory per node (no DB cost); `groupConcurrency` is DB-tracked via active count CTE (works across distributed deployments). Cannot use both simultaneously.
- pg-boss `db` option accepts any `{ executeSql(text, values) }` object — enables transactional outbox pattern: enqueue job in same DB transaction as business write.
- pg-boss `Bam` class runs heavy async DDL (index creation) from a `pgboss.bam` queue table in background — prevents startup timeout on large existing tables during migrations.
- pg-boss `delay()` returns an `AbortablePromise` — `.abort()` immediately wakes sleeping workers. Used by `notifyWorker()` to skip the polling interval after a new job is known to exist.
- pg-boss `job_state` ENUM is ordered numerically (created < retry < active < completed < cancelled < failed) — allows SQL range comparisons like `state < 'active'` for "queued" and `state > 'active'` for "done".
- pg-boss `key_strict_fifo` policy blocks new jobs with the same singletonKey while any job with that key is active/retry/failed — guarantees per-key ordering (e.g. WhatsApp messages per contact JID).

## 2026-04-12 (trycua/cua)
- Registry decorator pattern for agent loop selection: `@register_agent(models=r"claude-.*", priority=10)` + `find_agent_config(model)` eliminates if/elif chains when routing to multiple LLM providers. Validated at decoration time (not call time) that required methods exist.
- AsyncCallbackHandler with 15 lifecycle hooks (on_run_start/end, on_run_continue, on_llm_start/end, on_computer_call_start/end, on_function_call_start/end, on_api_start/end, on_text, on_usage, on_screenshot, on_responses) provides complete observability and control over agent loops. `on_run_continue()` returning False is the clean stop mechanism.
- Image retention for long-running agents: must remove screenshot triples (reasoning + computer_call + computer_call_output) not individual messages — orphaned call items without outputs cause API errors. Keep only the N most recent.
- Retry only at agent loop level, not inside individual API calls — LiteLLM has its own inner retries. Stacking them gives max_retries² attempts. Use `_is_retryable_error()` to filter: only RateLimitError, Timeout, ServiceUnavailableError, APIConnectionError — never retry validation or auth errors.
- REST-first / WebSocket-fallback transport: REST POST to `/cmd`, catch "Request failed"/"malformed response" then escalate to WebSocket. WebSocket needs `asyncio.Lock` on recv to serialize concurrent callers — without it parallel commands receive each other's responses.
- Screenshot coordinate scaling for LLM computer-use: downscale to 1024×768 before sending to model (LANCZOS), store `scale_x = new_w/orig_w`, `scale_y = new_h/orig_h`. Upscale returned coordinates with `int(round(coord / scale))` before executing pyautogui click.
- WebSocket keep-alive task exponential backoff: start at 1s, double on each failure, cap at 30s. Log details only on first attempt and every 500th — prevents log flooding during extended outages without losing visibility.
- MCP server `run_multi_cua_tasks` with `asyncio.gather(*coroutines, return_exceptions=True)` enables concurrent task execution with per-task exception isolation — failed tasks return error string instead of crashing the batch.

## 2026-04-12 (Langfuse analysis)
- BullMQ sharded queues: use `Map<shardIndex, Queue>` + SHA-256 consistent hashing on `projectId-eventBodyId` to distribute load across Redis shards. `getShardIndex(key, count)` = `parseInt(sha256(key).slice(0,8), 16) % count`.
- BullMQ secondary queue pattern: when S3 SlowDown detected for a project, set Redis key with TTL (`langfuse:s3-slowdown:${projectId}`, "EX", N), check in processor and redirect job to lower-concurrency secondary queue. Fail-open: return false if Redis unavailable.
- BullMQ WorkerManager pattern: centralize all `new Worker()` calls behind `WorkerManager.register(queueName, processor, opts)` which wraps every processor in a metric-collecting function — wait_time, processing_time, queue_length gauges all collected automatically.
- S3-first ingestion pipeline for observability: upload events to S3 first (as staging), then add job to queue with `delay: 5000ms` to allow batching multiple updates. Worker lists all S3 files for the entity, downloads + merges by timestamp, writes single record to ClickHouse. Redis `recently-processed` cache (TTL 5 min) prevents duplicate processing.
- ClickhouseWriter adaptive batch splitting: when JS string concatenation hits `Invalid string length` error, split batch in half recursively until single item, then truncate oversized fields (input/output/metadata capped at 1MB with `[TRUNCATED]` suffix). Prevents one huge LLM response from blocking entire batch.
- Dual API key hashing migration: store both `hashedSecretKey` (bcrypt, legacy) and `fastHashedSecretKey` (SHA-256 with salt). On first use of old key, compute and save SHA-256. All subsequent checks use SHA-256 fast path. Sentinel value `"api-key-non-existent"` is cached in Redis to protect against enumeration attacks.
- tRPC differentiated error logging: log NOT_FOUND/UNAUTHORIZED as `logger.info`, UNPROCESSABLE_CONTENT as `logger.warn`, all others as `logger.error`. Without this Railway logs get flooded with expected 404s and real errors are buried.
- Deterministic trace sampling via SHA-256: `isInSample(traceId, rate)` = `parseInt(sha256(traceId).slice(0,8), 16) / 0xffffffff < rate`. Same traceId always gives same sampling decision — all spans of a trace are consistently sampled or dropped.
- tRPC 4xx vs 5xx message exposure: `httpStatus >= 400 && httpStatus < 500` means error message is safe to expose to client; 5xx errors get "Internal error. We have been notified." to avoid leaking implementation details.
- Winston OTel baggage format: inject `dd.trace_id`, `dd.span_id`, `trace_id`, `span_id` from active OTel span into every log entry via custom format. Also inject all OTel baggage entries (projectId, orgId, userId) — eliminates need to pass context explicitly to every logger call.
- BullMQ DLQ cron retry: use `DeadLetterRetryQueue` with `repeat: { pattern: "0 */10 * * * *" }` to periodically call `queue.getFailed()` and `job.retry()` on specific queues. Track `dlq_retry_delay = now - job.timestamp` histogram to measure how long jobs stayed dead.
- Zod-typed BullMQ jobs: define all payloads as Zod schemas, export `TQueueJobTypes` mapped type keyed by `QueueName` enum. Processor receives `Job<TQueueJobTypes[QueueName.X]>` — full TypeScript inference, no casts needed. Schema changes cause compile errors in all affected processors.
- Event batch sort order: process `trace-create`/`span-create` BEFORE `span-update`/`generation-update` even if updates arrive in same batch. Sort: non-updates first (by timestamp asc), then updates (by timestamp asc). Prevents update being applied before create when SDK sends both in one call.
- pg-boss clock skew detection: Timekeeper compares `SELECT round(date_part('epoch', now()) * 1000)` to `Date.now()` every 10 min, emits warning if delta > 60s. Cron uses `Date.now() + clockSkew` for fire decisions.

## 2026-04-12
- APScheduler MongoDBJobStore requires a synchronous PyMongo client (not async Motor) — use `pymongo.MongoClient` for the jobstore even if the rest of the app uses Motor for all other DB access.
- APScheduler with MongoDBJobStore automatically detects and runs missed jobs on startup — no custom catch-up logic needed when the server restarts mid-schedule.
- Selective per-platform retry: pass `retry_platforms: list[str] | None` to the publish job function — None signals first attempt (use all platforms), a list signals retry (only failed platforms). Prevents re-posting to successful platforms.
- `replace_existing=True` + `id=post_id` in APScheduler `add_job()` makes rescheduling idempotent — editing a post just calls `schedule_post()` again and the old job is replaced automatically.
- Twitter media upload still requires Tweepy v1 API (`api_v1.media_upload`) even when using v2 for posting (`client.create_tweet`) — you need both client instances simultaneously.
- `secrets.compare_digest()` must be used instead of `==` for API key comparison — constant-time comparison prevents timing attacks where attackers enumerate key characters by measuring response time differences.
- Fail-fast startup guard for required config: `if not settings.API_KEY: raise RuntimeError(...)` in config.py prevents the server from running silently with broken auth.
- Double MIME validation for uploads: check `Content-Type` header (client claim) first, then `python-magic` magic bytes (server-side actual content) — prevents renamed executable files from passing as images.
- Telegram `sendMediaGroup` requires `attach://{name}` protocol for local files in multipart requests; caption only goes on the first media item; GIFs must be typed as "photo" in media groups (not "animation").
- `loop.run_in_executor(None, sync_fn, *args)` is the correct pattern for wrapping synchronous platform SDKs (tweepy, praw, requests) inside async FastAPI route handlers.

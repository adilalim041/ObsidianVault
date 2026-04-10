# Backend Expert — Learnings

> Auto-updated after each run.

---

## 2026-04-10
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

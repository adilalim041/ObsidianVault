# Backend Expert — Learnings

> Auto-updated after each run.

---

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

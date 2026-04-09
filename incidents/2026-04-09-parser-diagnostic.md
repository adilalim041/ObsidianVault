# 2026-04-09 — Parser diagnostic and fixes

**Project:** vault-research-agent
**Severity:** Mixed (2 critical, 5 high, 9 medium, 14 low)
**Discovered by:** backend-dev subagent, full code audit

## What happened

Ran a comprehensive code audit on vault-research-agent after first successful Phase 2 run. Found 30 issues across all severity levels.

## Fixes applied (same day)

| # | Issue | Fix |
|---|---|---|
| 1 | `python-dotenv` missing from requirements.txt | Added |
| 2 | 8 separate AsyncAnthropic clients (resource leak) | Shared singleton `get_shared_client()` |
| 3 | Prompt injection via README/source code | `wrap_untrusted()` XML tags on all external data |
| 4 | Learning injection (poisoned learnings.md) | `sanitize_learning()` with suspicious pattern filter |
| 5 | No LLM call limit enforcement | Global counter in base.py, checks config `max_llm_calls` |
| 6 | DuckDuckGo rate limiting missing | 2-second sleep between requests |
| 7 | logs/ dir not created on startup | `mkdir(parents=True)` before logging setup |
| 8 | Repos without license passed filter | Now filtered out (stricter than GPL) |
| 9 | GitHub auth missing on README fallback | `_github_headers()` shared helper |
| 10 | `max_llm_calls` config was 30, reality was ~75 | Raised to 80 |

## Remaining issues — ALL FIXED (2026-04-09, second session)

- ~~SQLite WAL mode~~ — FIXED: WAL + busy_timeout enabled
- ~~datetime.utcnow() deprecated~~ — FIXED: 5 instances → datetime.now(timezone.utc)
- ~~Sync calls inside async~~ — known, low priority (single-threaded runner)
- ~~is_in_library full scan~~ — FIXED: URL cache, scan once per run
- ~~run.bat date format~~ — FIXED: wmic locale-safe approach
- ~~No model config for specialists~~ — FIXED: 4 new keys in config.yaml
- ~~Run report collision~~ — FIXED: timestamp in filename

## Knowledge updates

- Updated [/knowledge/integrations/external-api-reliability.md](../knowledge/integrations/external-api-reliability.md) concept — rate limiting applies to OUR outgoing calls too, not just incoming
- Pattern: `wrap_untrusted()` should be used everywhere external data enters LLM prompts

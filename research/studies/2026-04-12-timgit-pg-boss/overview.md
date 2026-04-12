# Deep Study: pg-boss

**URL:** https://github.com/timgit/pg-boss
**Studied:** 2026-04-12
**Deep Score:** 9.0/10
**Stack:** Node.js, PostgreSQL, SQL CTEs, advisory locks
**Architecture:** library (job queue)
**Status:** studied
**Recommendation:** adopt

## Summary
PostgreSQL-native job queue. No Redis needed. FOR UPDATE SKIP LOCKED for concurrency, retry with exponential backoff + jitter in SQL, DLQ, cron scheduling, throttle/debounce, 6 queue policies, transactional outbox pattern. 12 patterns extracted with full SQL.

## Relevance
- **News.AI:** CRITICAL — content pipeline scheduling, multi-provider LLM calls with group concurrency
- **Omoikiri:** HIGH — WhatsApp message queue with strict FIFO per JID (key_strict_fifo policy)

## Subagent Reports
- [Backend analysis](backend.md) — 12 patterns, 14 learnings

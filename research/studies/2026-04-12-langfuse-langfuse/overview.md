# Deep Study: Langfuse

**URL:** https://github.com/langfuse/langfuse
**Studied:** 2026-04-12
**Deep Score:** 9.0/10
**Stack:** Next.js, tRPC, Prisma, PostgreSQL, ClickHouse, BullMQ, Redis, S3, Winston
**Architecture:** monorepo (full SaaS platform)
**Status:** studied
**Recommendation:** watch

## Summary
Production LLM observability SaaS. tRPC for dashboard API, REST for ingestion. S3-first event staging with 5s delay for trace merging. WorkerManager centralizes BullMQ workers with auto-metrics. DLQ with cron retry. Deterministic sampling via sha256. 11 patterns extracted.

## Relevance
- **News.AI:** HIGH — WorkerManager pattern for Brain/Generator/Publisher, DLQ retry for failed publishes, differentiated logging (info vs error)
- **General architecture:** Full SaaS reference — auth, workers, API design, observability

## Subagent Reports
- [Backend analysis](backend.md) — 11 patterns, 12 learnings

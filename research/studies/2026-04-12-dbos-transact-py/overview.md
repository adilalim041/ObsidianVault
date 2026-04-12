# Deep Study: DBOS Transact Python

**URL:** https://github.com/dbos-inc/dbos-transact-py
**Studied:** 2026-04-12
**Deep Score:** 8.5/10
**Stack:** Python, PostgreSQL, pickle/JSON serialization
**Architecture:** library (durable workflow framework)
**Status:** studied
**Recommendation:** watch

## Summary
Durable workflow execution — functions survive crashes via PostgreSQL state persistence. Decorator-driven durability (@DBOS.workflow, @DBOS.step), once-and-only-once execution via operation_outputs lookup, crash recovery as first-class feature, PostgreSQL as state machine, queue with concurrency + rate limiting without Redis. 10 patterns.

## Relevance
- **Nexus.AI:** HIGH — RPA step-sequences as durable workflows, resume after Windows crash
- **News.AI:** HIGH — pipeline (parse→classify→generate→publish) as single workflow with deduplication

## Subagent Reports
- [Backend analysis](backend.md) — 10 patterns with full code

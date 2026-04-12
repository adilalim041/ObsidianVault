# Deep Study: BricksLLM

**URL:** https://github.com/bricks-cloud/BricksLLM
**Studied:** 2026-04-12
**Deep Score:** 8.5/10
**Stack:** Go, PostgreSQL, Redis, cenkalti/backoff
**Architecture:** monolith (API gateway)
**Status:** studied
**Recommendation:** watch

## Summary
Go-based LLM gateway with ordered failover steps (per-step backoff, not global), virtual API keys with SHA256 + Redis caching, rate limiting via Redis HIncrBy, in-process message bus for async event logging, response caching by request body hash, and PII detection with graduated actions. 8 patterns.

## Relevance
- **News.AI:** HIGH — fallback provider chain, in-memory playbook caching, response caching by content hash
- **General:** Virtual key rotation, rate limiting patterns

## Subagent Reports
- [Backend analysis](backend.md) — 8 patterns with full code

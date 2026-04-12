# Deep Study: llm-gateway

**URL:** https://github.com/NullRabbitLabs/llm-gateway
**Studied:** 2026-04-12
**Deep Score:** 7.5/10
**Stack:** Python, FastAPI, importlib (lazy loading)
**Architecture:** monolith (API proxy)
**Status:** studied
**Recommendation:** watch

## Summary
Python LLM proxy over 5 providers. JSON-externalized provider registry with lazy imports. Fallback chain with aggregated errors. 3-way retry guard (4xx/rate-limit/transient). Tool call normalization to OpenAI format. Cost tracking in microcents. Dual versioned API. 7 patterns.

## Relevance
- **News.AI:** HIGH — fallback chain pattern for adilflow_brain, cost tracking, tool call normalization
- **Nexus.AI:** MEDIUM — provider registry pattern for media_providers.py

## Subagent Reports
- [Backend analysis](backend.md) — 7 patterns, 8 learnings

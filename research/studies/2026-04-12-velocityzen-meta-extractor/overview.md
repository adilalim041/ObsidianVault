# Deep Study: meta-extractor

**URL:** https://github.com/velocityzen/meta-extractor
**Studied:** 2026-04-12
**Deep Score:** 7.0/10
**Stack:** Node.js, got, htmlparser2, file-type
**Architecture:** library (single file, 196 lines)
**Status:** studied
**Recommendation:** adopt

## Summary
Compact URL metadata extractor. Stream-based parsing with body limit guard (2MB), lazy HTML parser with binary early-exit, regex-driven meta tag filtering, RSS/Atom feed discovery, image dedup via Set. 7 patterns. Production wrapper with p-retry included.

## Relevance
- **News.AI:** DIRECT — URL preview for dashboard, RSS feed auto-discovery
- **Parser:** RSS source discovery

## Subagent Reports
- [Backend analysis](backend.md) — 7 patterns with ready-to-use wrapper

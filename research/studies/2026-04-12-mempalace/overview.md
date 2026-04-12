# Deep Study: MemPalace

**URL:** https://github.com/milla-jovovich/mempalace
**Studied:** 2026-04-12
**Deep Score:** 9.5/10
**Stack:** Python, ChromaDB, SQLite, sentence-transformers, MCP
**Architecture:** library (AI memory system)
**Status:** studied
**Recommendation:** adopt

## Summary
Highest-scoring AI memory system (96.6% LongMemEval). Palace architecture: wings→halls→rooms→closets→drawers. Raw verbatim storage in ChromaDB without summarization. 4-layer wake-up for minimal token cost. Temporal knowledge graph on SQLite. MCP server for Claude integration. Query sanitization critical for search quality.

## Why this is the most important study
This directly addresses our core problem: Claude Code loses context between sessions. MemPalace can be layered ON TOP of ObsidianVault — mine our vault into a searchable palace. Human reads files, AI searches vectors.

## Relevance
- **ObsidianVault:** Layer MemPalace on top for semantic search of our 14k+ lines of studies
- **Nexus.AI:** Replace assistant_memory.db with MemPalace (Python, temporal KG, semantic search)
- **Claude Code hooks:** Add precompact hook to prevent context loss

## Subagent Reports
- [Backend analysis](backend.md) — 11 patterns with full code

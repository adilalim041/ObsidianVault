# Deep Study: MarkItDown

**URL:** https://github.com/microsoft/markitdown
**Studied:** 2026-04-12
**Deep Score:** 8.0/10
**Stack:** Python, pdfplumber, mammoth, beautifulsoup4, Magika ML classifier
**Architecture:** library (file converter)
**Status:** studied
**Recommendation:** adopt

## Summary
Microsoft's file-to-Markdown converter. Priority-based converter chain with graceful degradation, Magika ML for file type detection (not extension-based), frozen immutable StreamInfo, HTML as universal intermediate format, lazy imports with deferred exc_info, PDF tables via word clustering, entry-point plugin system. 7 patterns.

## Relevance
- **Nexus.AI:** DIRECT — PDF/DOCX to Markdown for Telegram bot document processing
- **Parser:** HTML→Markdown via markdownify instead of raw BeautifulSoup

## Subagent Reports
- [Backend analysis](backend.md) — 7 patterns with full code

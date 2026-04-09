# Omoikiri.AI — Backlog

## Active threads (what's being worked on right now)

- **Database work** — schema improvements, table cleanup. `ai_queue` table is dead code (2026-04-09: enqueue removed, table can be dropped).
- **AI analyzer accuracy** — Zod validation added (2026-04-09), prompt improved with confidence calibration + edge cases. Next step: fill TODO_FILL placeholders in `knowledgeBase.js` with real product data — this is the #1 accuracy lever now.

## Near-term

- Bug fixes and feature polish (no specific list yet — added as they come up)
- ~~Documenting the full Supabase schema in `architecture.md`~~ DONE 2026-04-09
- Fill `knowledgeBase.js` TODO_FILL placeholders with real Omoikiri product data (Adil-dependent)
- Wave 5A: analytics dashboard upgrade — TanStack Table installed, Tremor migration deferred until full redesign

## Medium-term

- **Marketing-side metrics:** add ad performance, campaign tracking, integration with whatever ad platform(s) the business uses
- **Funnel report polish:** make sales reports presentable enough to show stakeholders without embarrassment

## Long-term / strategic

- **Templatize for resale:** factor out business-specific logic so other small/medium businesses can plug in their WhatsApp + sales setup. This is the path to monetization and should influence design decisions today (avoid hard-coding business names, account IDs, custom fields).
- **Multi-tenant support** (consequence of templatization)

## Explicitly NOT doing

- WABA migration (see decisions.md)
- Migration to no-code platforms (see decisions.md)
- Building Adil's personal brand around this (out of scope — News.AI is the brand-adjacent project)

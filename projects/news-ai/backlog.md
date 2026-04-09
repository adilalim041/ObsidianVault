# News.AI (AdilFlow) — Backlog

> The source-of-truth backlog lives in `news-project/IMPROVEMENT_BACKLOG.md`. This file tracks higher-level threads and intent.

## Active threads

- **Template testing** — actively iterating on TemplateV1 templates
- **Working chain: Gemini image + properly-prompted headline + matched image** — building the first reliable end-to-end generator for a single post
- **Fixing API lag/failure issues** — ongoing reliability work on external API calls

## Near-term

- Get one full pipeline running end-to-end into a real test channel (even if not the brand channel)
- ~~Add proper retry/backoff for AI API calls~~ ✅ Done 2026-04-09 (p-retry + p-queue in Generator, Publisher, Brain)
- ~~Add per-call logging so failures are traceable~~ ✅ Done 2026-04-09 (Pino structured logs with provider/latency/outcome)

## Medium-term

- **Pick a brand name and visual identity** — currently the biggest blocker for going public. Without a name, can't launch any channel.
- Stand up the first 1-2 niche channels under that brand
- Decide which platform to launch first (likely Instagram OR TikTok, then both)
- Implement per-task LLM specialization properly across `brain` + `generator` (decisions.md)

## Long-term / strategic

- Multiple channels in multiple niches, one consistent brand
- Use the audience as a platform to amplify other Adil projects
- Eventually: video content (TikTok, Reels)
- Eventually: ad performance / monetization layer

## Explicitly NOT doing

- DALL-E for image generation (decisions.md)
- n8n / no-code orchestration (decisions.md)
- Off-the-shelf template editors (decisions.md)
- Personal brand around Adil himself (this is brand-as-business)
- Long-form content (focus is short social formats)

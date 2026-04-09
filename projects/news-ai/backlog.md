# News.AI (AdilFlow) — Backlog

> The source-of-truth backlog lives in `news-project/IMPROVEMENT_BACKLOG.md`. This file tracks higher-level threads and intent.

## Active threads

- ~~**Fixing API lag/failure issues**~~ ✅ Done 2026-04-09 (p-retry + p-queue + Pino in all services)
- ~~**Dashboard upgrade**~~ ✅ Done 2026-04-10 (React SPA, shadcn/ui, pipeline page, playbook editor)
- ~~**Prompt management from dashboard**~~ ✅ Done 2026-04-10 (playbooks store full prompts, Generator reads them)
- **Template testing** — iterating on TemplateV1 templates
- **Gemini billing** — image generation blocked until Google billing activated. Fallback = source image / Unsplash placeholder
- **Publisher 502** — Publisher service not starting on Railway (under investigation)

## Near-term

- **Fix Publisher 502** — service not responding on Railway. Works locally. Needs Railway deploy log investigation.
- **Enable Gemini billing** → switch to `gemini-3-pro-image-preview` for best quality covers
- **Create playbooks for all 12 niches** — currently only ai_news and health_medicine have playbooks
- **Add "Create Playbook" button** to dashboard (currently can only edit existing)
- **Add per-article actions in Pipeline** — generate/reject/publish specific articles (Brain endpoints exist, UI buttons partially done)
- Get one full pipeline running end-to-end into a real test channel
- ~~Add proper retry/backoff for AI API calls~~ ✅ 2026-04-09
- ~~Add per-call logging so failures are traceable~~ ✅ 2026-04-09
- ~~Dashboard with pipeline visualization~~ ✅ 2026-04-10
- ~~Prompt management from dashboard~~ ✅ 2026-04-10
- ~~Parser integration in dashboard~~ ✅ 2026-04-10 (Parse RSS button + date filter)

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

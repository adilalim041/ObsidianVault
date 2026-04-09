# News.AI (AdilFlow) — Architecture

**Last verified:** 2026-04-10 (verified against code)

## Microservices

All 6 services are **independent git repos** deployed separately on Railway. The parent `news-project/` repo holds them as gitlinks. Each service is intentionally designed to be **reusable in other projects** — that's the main reason for the split (see decisions.md).

| Service | Role | Stack | State |
|---|---|---|---|
| `adilflow_brain` | Orchestrator + central DB. Coordinates the whole pipeline. Decides which prompts to feed which AI for each task, given the current structure/state. | Node | Working |
| `adilflow_parser` | Source ingestion. Currently RSS-based: pulls news with images, headlines, body. Has a filter for selecting specific articles. | Node | Working |
| `adilflow_generator` | Generates images (wants Gemini, latest model). Possibly also generates headlines and copy. Searches/composes the right prompts for each piece. | Node | Working, accuracy WIP |
| `adilflow_publisher` | Publishes finished content to target channels. | Node | Working |
| `adilflow_dashboard` | React SPA dashboard (shadcn/ui + Tremor + TanStack Table). Pipeline visualization, playbook management, manual actions, template links. | Node + React/Vite | Working, actively developing |
| `TemplateV1` | **Standalone template engine.** Creates post templates with variables that AI fills in with the right source data. Server + client. | Node + frontend | Working, in active testing |

## Data flow (high level)

1. **Parser** pulls articles from RSS sources, applies filter, stores raw articles + images + headlines
2. **Brain** picks up new articles, decides which prompts and which models to use, kicks off the pipeline
3. **Generator** produces visual assets (images via Gemini) and text variants (headline, caption) using the prompts brain provided
4. **TemplateV1** wraps the generated content into a final post template (image + text composited correctly)
5. **Publisher** takes the finished post and pushes it to the target channel(s)
6. **Dashboard** lets Adil watch the whole thing and intervene

## External services

- **Gemini** (`gemini-2.5-flash-image`, want `gemini-3-pro-image-preview` when billing active) — image generation. Requires paid API (free tier limit=0 for image gen).
- **OpenAI / GPT-4o-mini** — headline/caption generation (via playbook prompts) + article classification (score 1-10)
- **Supabase** (`advluvxpllxxzjrxeskm.supabase.co`) — PostgreSQL + pgvector for Brain. Tables: `articles`, `niches`, `channel_profiles`, `content_playbooks`, `template_bindings`, `sources`, `api_keys`.
- **Cloudinary** (`do0zl6hbd`) — image hosting for covers and generated images
- **Instagram Graph API** (`v24.0`) — publishing to Instagram (via Publisher)
- **Railway** — hosting for all 6 services. Auto-deploy from GitHub.
- **GitHub** — each service has its own repo (`adilalim041/adilflow-*`)

## AI model strategy

Per-task LLM specialization:
- Image gen: Gemini (waiting for billing to enable Pro)
- Headline/caption/hashtag generation: GPT-4o-mini (configurable per niche via playbook `system_prompt`)
- Article classification: GPT-4o-mini (score 1-10)
- **Prompts are now managed via Brain playbooks**, not hardcoded. Dashboard → Playbooks → AI Prompts tab.

## Reliability layer (added 2026-04-09)

All external API calls across Generator, Publisher, Brain wrapped in:
- `p-retry@6` — 3 retries, exponential backoff, AbortError on 4xx
- `p-queue@8` — concurrency control (Gemini×2, OpenAI×3, Cloudinary×3, Instagram×1)
- Pino structured logging — `{ provider, latencyMs, outcome, articleId }`

## Dashboard (added 2026-04-09/10)

React SPA with 5 pages:
- **Dashboard** — service status (5 services), pipeline stats, manual actions (Parse RSS, Generate, Publish)
- **Pipeline** — visual stages (raw→classified→...→published), article table with TanStack Table, article detail Sheet (journey map: Source → Classification → Generation → Visual Assets → Publication)
- **Templates** — template cards, "Open in Editor" links to TemplateV1
- **Playbooks** — view/edit AI prompts per niche (system_prompt, image_system_prompt, user_prompt_template) + rules + examples
- **Settings** — niches, channel profiles, scheduler

Stack: React 18, Vite 5, Tailwind 3, shadcn/ui, Tremor, TanStack Table, lucide-react. Multi-stage Dockerfile (build client → serve).

## Parser — RSS ingestion (12 niches)

48 RSS feeds across 12 niches defined in `adilflow_parser/sources.json`:
health_medicine (4), technology (5), ai_news (5), sports (5), finance (4), automotive (4), gaming (6), politics (4), world_news (5), good_news (3), kazakhstan (4, ru), kazakhstan_en (2).

Parser filters articles >7 days old (`MAX_ARTICLE_AGE_DAYS`). Dedup by URL hash. Brain does 3-level dedup: url_hash → content_hash → DB constraint.

Currently only `ai_news` and `health_medicine` have playbooks. Other niches have feeds but no generation config.

## In-repo documentation

The `news-project/` root contains existing docs:
- `IMPROVEMENT_BACKLOG.md` — improvement backlog (source of truth for backlog items)
- `ONE_BRAIN_ARCHITECTURE.md` — architectural design doc for the brain service
- `OPERATIONS_RUNBOOK.md` / `OPS_GUIDE.md` — operational procedures

## How to verify this file is still accurate

- `cd news-project && git log --all -10 --oneline` — recent activity across the parent
- `cd news-project/adilflow_brain && git log -5` — and same for each subservice
- For exact data flow: check the actual API endpoints in each service, especially how `brain` calls the others
- For current AI model choices: grep for `gemini`, `gpt-`, `claude` in the generator service

## Public URLs

- Each service has its own Railway URL — not yet documented here. Check Railway dashboard.
- Dashboard URL — TBD

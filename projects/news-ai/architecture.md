# News.AI (AdilFlow) — Architecture

**Last verified:** 2026-04-07 (from interview, not yet verified against code)

## Microservices

All 6 services are **independent git repos** deployed separately on Railway. The parent `news-project/` repo holds them as gitlinks. Each service is intentionally designed to be **reusable in other projects** — that's the main reason for the split (see decisions.md).

| Service | Role | Stack | State |
|---|---|---|---|
| `adilflow_brain` | Orchestrator + central DB. Coordinates the whole pipeline. Decides which prompts to feed which AI for each task, given the current structure/state. | Node | Working |
| `adilflow_parser` | Source ingestion. Currently RSS-based: pulls news with images, headlines, body. Has a filter for selecting specific articles. | Node | Working |
| `adilflow_generator` | Generates images (wants Gemini, latest model). Possibly also generates headlines and copy. Searches/composes the right prompts for each piece. | Node | Working, accuracy WIP |
| `adilflow_publisher` | Publishes finished content to target channels. | Node | Working |
| `adilflow_dashboard` | Frontend for monitoring and interacting with each service. | Node + UI | Working |
| `TemplateV1` | **Standalone template engine.** Creates post templates with variables that AI fills in with the right source data. Server + client. | Node + frontend | Working, in active testing |

## Data flow (high level)

1. **Parser** pulls articles from RSS sources, applies filter, stores raw articles + images + headlines
2. **Brain** picks up new articles, decides which prompts and which models to use, kicks off the pipeline
3. **Generator** produces visual assets (images via Gemini) and text variants (headline, caption) using the prompts brain provided
4. **TemplateV1** wraps the generated content into a final post template (image + text composited correctly)
5. **Publisher** takes the finished post and pushes it to the target channel(s)
6. **Dashboard** lets Adil watch the whole thing and intervene

## External services

- **Gemini** (latest available) — image generation (preferred)
- **OpenAI / GPT-4-mini** — currently used for prompts/headlines (not final, see decisions about per-task LLM specialization)
- **Supabase** — likely used by `brain` and other services for storage; needs to be confirmed against code
- **Railway** — hosting for all services
- **GitHub** — each service has its own repo and CI

## AI model strategy (intent, not yet fully implemented)

Adil's goal is **per-task LLM specialization**: each kind of task uses the LLM that's actually best at that task, not "one model for everything". Currently:
- Image gen: Gemini (latest)
- Prompt-writing / headlines: GPT-4-mini (placeholder, will likely change)
- No final pinning yet — this is an active design space

## In-repo documentation

The `news-project/` root contains existing docs that are the source of truth — reference them rather than duplicating:

- `ONE_BRAIN_ARCHITECTURE.md` — architectural design doc for the brain service
- `OPERATIONS_RUNBOOK.md` — operational procedures
- `OPS_GUIDE.md` — operational guide
- `IMPROVEMENT_BACKLOG.md` — improvement backlog (treat as the truth, supersedes anything in this vault's `backlog.md`)

## How to verify this file is still accurate

- `cd news-project && git log --all -10 --oneline` — recent activity across the parent
- `cd news-project/adilflow_brain && git log -5` — and same for each subservice
- For exact data flow: check the actual API endpoints in each service, especially how `brain` calls the others
- For current AI model choices: grep for `gemini`, `gpt-`, `claude` in the generator service

## Public URLs

- Each service has its own Railway URL — not yet documented here. Check Railway dashboard.
- Dashboard URL — TBD

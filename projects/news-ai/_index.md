# PROJECT: News.AI

> ⚠️ This is the News.AI project (AdilFlow). Do not confuse with Omoikiri.AI or Nexus.AI.

## Identity

- **Project name:** News.AI / AdilFlow
- **Repo folder name:** `news-project`
- **Path on disk:** `C:\Users\User\Desktop\news-project\`
- **Status:** Active
- **One-line description:** Autonomous media system: parse → classify → generate → publish

## Stack (high level)

- Multi-service architecture, each service is its own git repo (gitlinks at the parent level):
  - `adilflow_brain` — orchestration/decision layer
  - `adilflow_parser` — source ingestion
  - `adilflow_generator` — content generation
  - `adilflow_publisher` — output to channels
  - `adilflow_dashboard` — monitoring/control UI
  - `TemplateV1` — template engine (server + client)
- Hosting: Railway (each service deployed independently)
- Storage: Supabase (`<SUPABASE_PROJECT_REF>`)

## Project files

- [overview.md](overview.md)
- [architecture.md](architecture.md)
- [decisions.md](decisions.md)
- [gotchas.md](gotchas.md)
- [backlog.md](backlog.md)

## Key URLs (no secrets)

> Filled during interview.

## Source-of-truth checklist

- The 6 sub-services are **independent git repos**. Each has its own state.
- For service-specific work, `cd` into the subservice and check its own git history.
- Cross-service contracts (API shapes between brain ↔ parser etc.) live in `architecture.md`. Verify against actual code before trusting them.

## Important docs in the repo itself

- `ONE_BRAIN_ARCHITECTURE.md` (in `news-project/`)
- `OPERATIONS_RUNBOOK.md`
- `OPS_GUIDE.md`
- `IMPROVEMENT_BACKLOG.md`

These are the existing docs. The vault should reference them, not duplicate them.

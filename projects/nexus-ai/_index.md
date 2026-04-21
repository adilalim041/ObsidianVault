# PROJECT: Nexus.AI

> ⚠️ This is the Nexus.AI project. Do not confuse with Omoikiri.AI or News.AI. **This is a Python project**, unlike the others.

## Identity

- **Project name:** Nexus.AI
- **Repo folder name:** `AbdAdl`
- **Path on disk:** `C:\Users\User\.gemini\antigravity\playground\ionized-shepard\AbdAdl\`
- **Status:** Experimental
- **One-line description:** Python-based personal assistant with persistent memory and media generation

## Stack (high level)

- **Language:** Python (NOT Node.js — careful, the other two are Node)
- Local SQLite for memory: `assistant_memory.db` (gitignored, contains private conversation data)
- Telegram bot interface (`bot.py`)
- Media generation (`media_generator.py`, multiple providers in `media_providers.py`)
- OS-level control (`os_controller.py`)
- Job manager (`job_manager.py`)
- Router/dispatch (`router.py`)
- Runtime guard (`runtime_guard.py`)
- Web parser (`web_parser.py`)

## Project files

- [overview.md](overview.md)
- [architecture.md](architecture.md)
- [decisions.md](decisions.md)
- [gotchas.md](gotchas.md)
- [backlog.md](backlog.md)

## Recent phases

- **Phase 1A/1B** (2026-04-21): Semantic memory via Supabase + pgvector. See `architecture.md`.
- **Phase 2** (2026-04-21): Ideas dual-write to Vault via GitHub API. See `architecture.md`.
- **Phase 3** (2026-04-21): Proactive daily task tracker. See `architecture.md` section "Daily Task Tracker". New files: `daily_tracker.py`, `vault_summary.py`. New tables: `nexus_daily_tasks`, `nexus_daily_state`. Migration: `migrations/2026-04-21_nexus_daily_tasks.sql`.

## Source-of-truth checklist

- This project uses a **local SQLite DB with real user data**. Do NOT delete it, do NOT commit it.
- `config.py` reads everything from env via `os.getenv` — no hardcoded secrets.
- `generated_media/` and `archive/` are gitignored — don't put code logic that depends on them being in git.

# Nexus.AI — Architecture

**Last verified:** 2026-04-07 (from interview, NOT yet verified against code — many details below need checking)

## Language

**Python.** This is the only project of the three that's not Node.js. There is no specific reason — Adil started it in Python. When working on Nexus, do not assume Node patterns transfer.

## Interface

- **Telegram bot** (`bot.py`) — only entry point for commands
- **Launcher** (`nexus_launcher.pyw`) — Windows-only `.pyw` (silent Python) launcher script that just starts the bot. Not a separate runtime.

## Components (from file names — to be verified against code)

| File | Role (claimed) | Verified? |
|---|---|---|
| `bot.py` | Telegram bot entry point | ✓ confirmed by Adil |
| `router.py` | Dispatches messages/commands | not yet read |
| `memory.py` + `assistant_memory.db` | Persistent memory layer (SQLite). Currently stores conversation history, *intended* to be persistent long-term memory. | partial — see TODO below |
| `job_manager.py` | Background job orchestration | not yet read |
| `media_generator.py` + `media_providers.py` | Generates images (currently a "weak" model — name TBD), abstracts over providers | not yet read |
| `os_controller.py` | **Executes OS-level commands on Adil's laptop.** Currently a narrow command set, needs significant expansion. ⚠️ Security-sensitive. | partial — see SECURITY note |
| `runtime_guard.py` | Runtime safety/limits | not yet read |
| `web_parser.py` | Web content fetching | not yet read |
| `api_client.py` | Some external API client (which one?) | not yet read |
| `config.py` | Env-based config (`os.getenv` for everything, no hardcoded secrets) | ✓ confirmed |

## TODOs to verify against code

1. **Which AI model is the bot actually using?** Adil said it's a "weak" model but not which one. Check `bot.py` / `media_generator.py` / `config.py`.
2. **Which image provider(s) are in `media_providers.py`?** Adil didn't specify in the interview.
3. **Project status check** — which project does it currently report on, and how does it reach it? Check `bot.py` and any project-status logic.
4. **What does `runtime_guard.py` actually guard against?** This is potentially relevant for safety expansion.

## Data flow (intended)

1. Adil sends a command in Telegram
2. `bot.py` receives → `router.py` dispatches
3. Router decides: text reply, image gen, OS command, project status, etc.
4. Memory is read/written in `memory.py` (SQLite)
5. Result returned to Telegram

## Security note — `os_controller.py`

This component executes commands on Adil's actual laptop. Current scope is narrow, but the plan is to expand it significantly. Before expanding:

- Confirm there's a whitelist of allowed actions (probably what `runtime_guard.py` is for — verify)
- Confirm the bot's command source (Telegram chat ID) is locked to Adil only
- Anything that touches files, deletes, or exfiltrates data needs explicit confirmation in chat
- Logging of every executed command should be on by default

## How to verify this file is still accurate

- `cd AbdAdl && ls *.py` — confirm component files still exist with these names
- `cat config.py` — verify env-based config and no secrets
- `git log --oneline` — recent activity
- For specific behaviors: read the relevant `.py` file directly, this whole file is currently from memory not from code

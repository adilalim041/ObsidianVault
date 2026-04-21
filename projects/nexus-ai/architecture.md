# Nexus.AI — Architecture

**Last verified:** 2026-04-09 (verified against code, post-refactoring)

## Language

**Python.** This is the only project of the three that's not Node.js. When working on Nexus, do not assume Node patterns transfer.

## Interface

- **Telegram bot** (`bot.py`) — entry point
- **Launcher** (`nexus_launcher.pyw`) — Windows-only silent launcher

## Modular structure (refactored 2026-04-09)

The bot was a 2400-line monolith. Now split into 10 files using aiogram v3 Router pattern:

| File | Lines | Role |
|---|---|---|
| `bot.py` | 76 | Entry point — imports routers, starts scheduler + polling |
| `core.py` | 132 | Shared state: Bot, Dispatcher, Scheduler, user_sessions, is_admin(), genai client, pyautogui sandbox |
| `states.py` | 43 | All FSM state classes (VideoGenForm, ContactForm, ReminderForm, etc.) |
| `helpers.py` | 303 | Utility functions: safe_send/edit, format_idea, enhance_prompt, parse_intent_payload, etc. |
| `keyboards.py` | 172 | All keyboard builders (dashboard, organizer, media, settings, etc.) |
| `reminders.py` | 76 | APScheduler: schedule_job, send_reminder, restore_reminders |
| `handlers/commands.py` | 158 | Slash commands: /start, /vault, /status, /research, /clear, /ideas, /dashboard |
| `handlers/callbacks.py` | 629 | All callback query handlers (action_*, kb_*, video_*, codex_*, confirm_*, rpa_*) |
| `handlers/forms.py` | 377 | Multi-step forms: Contact, Reminder, Video generation, Image generation |
| `handlers/messages.py` | 715 | Main intent-dispatch handler (catch-all for text/voice/photo) |

**Router registration order matters:** commands → callbacks → forms → messages (catch-all LAST).

### Other files (not refactored, standalone)

| File | Role |
|---|---|
| `router.py` | Intent classification via Gemini 2.5 Flash — 19 intents (16 original + 3 vault) |
| `vault_reader.py` | Reads ObsidianVault files for /vault, /status, /research |
| `memory.py` + `assistant_memory.db` | SQLite with WAL mode — contacts, reminders, ideas, global context |
| `config.py` | Env-based config (dotenv, no hardcoded secrets) |
| `job_manager.py` | Background job tracking + cleanup_old_jobs() |
| `media_providers.py` | Image (Gemini) + Video (Veo 3.1, Luma fallback) — synchronous, runs in to_thread |
| `os_controller.py` | OS commands — execute_bash (validated) + execute_trusted_status (hardcoded allowlist) |
| `runtime_guard.py` | Prevents duplicate bot processes |
| `web_parser.py` | URL content parsing (Jina + BeautifulSoup fallback, 2MB limit) |
| `api_client.py` | External API client (News pipeline, Supabase) |
| `codex_temp_adapter.py` | Integration with local Codex Temp rendering service |

**Deleted:** `media_generator.py` (was dead code, 227 lines, imported nowhere)

## Vault integration (added 2026-04-09)

Nexus reads the local ObsidianVault directly from disk via `vault_reader.py`:
- `/vault` — fresh candidates, library count, worklog activity
- `/status` — backlog counts + top items + recent gotchas per project
- `/research` — latest run report + candidate list for the week
- Also works via natural language (Gemini classifies into vault intents)

Requires `VAULT_PATH` env var (defaults to `C:\Users\User\Desktop\ObsidianVault`).

## Security hardening (2026-04-09 audit, 22 issues fixed)

- `is_admin()` — single unified auth check everywhere (was 3 different patterns)
- `execute_trusted_status()` — hardcoded allowlist, no `trusted=True` bypass anymore
- RPA/Computer Use — per-step confirmation buttons (Execute / Skip / Stop) before pyautogui runs
- SQL filter sanitization in api_client.py
- Input length limit (4000 chars) before Gemini
- Web download limit (2MB stream)
- Generic error messages to user (full details only to log)
- Screenshot UUID filenames (no race condition)
- Periodic cleanup: old jobs (24h), stale sessions (>50), media files (>24h)

## Known remaining issues (not fixed)

- `media_providers.py` is synchronous (requests + time.sleep) — works via to_thread but limits concurrency to ~5 threads. Rewrite to aiohttp someday.
- No rate limiting on Gemini API calls (single user, low risk)
- Reminder dates stored as "DD.MM.YYYY HH:MM" string, not ISO (fragile but works)
- `flet` removed from requirements but was never used — check if any UI plans existed

## Data flow

1. Adil sends message in Telegram
2. `handlers/messages.py` main_handler catches it
3. `router.py` analyze_intent() classifies via Gemini → one of 19 intents
4. Handler dispatches to appropriate action (save contact, generate image, OS command, vault read, etc.)
5. Memory read/written via `memory.py` (SQLite WAL mode)
6. Result returned to Telegram

## Semantic memory (Phase 1A, 2026-04-21)

**Status:** Foundation built, NOT integrated into main_handler yet. Integration = Phase 1B.

### Schema — two-table design

| Table | Purpose |
|---|---|
| `nexus_conversations` | Lightweight message store (user_id, role, content, tokens_est, created_at). Read often. No vectors. |
| `nexus_conversation_embeddings` | vector(768) per message. Separate table to avoid bloating reads that don't need vectors. Joined only on semantic search. |

**Why split:** `get_recent` and `save_message` SELECT run frequently without needing embeddings. Keeping vectors in a separate table keeps row width ~100 bytes vs ~3100 bytes. HNSW index on embedding table only.

### Embedding model

- **Gemini text-embedding-004** — 768 dimensions, free quota 1500 req/day (sufficient for single-user).
- Content truncated to 8000 chars before embedding (~2048 tokens in Russian).
- Embedding is **fire-and-forget**: `save_message` returns immediately after DB INSERT, embedding runs in `asyncio.create_task`. If it fails → warn log, message still accessible via `get_recent`.

### Search index

- **HNSW** (Hierarchical Navigable Small World) with `vector_cosine_ops`.
- Parameters: m=16, ef_construction=64 (balanced accuracy/memory for 768-dim).
- Cosine distance: 0 = identical, 2 = opposite. Threshold for relevance = 0.5 (configurable constant in `semantic_memory.py`).

### RPC: nexus_search_conversations

Supabase function that joins both tables and returns top-K messages by cosine distance. Supports optional `p_since` time-window filter (e.g., last 30 days).

```sql
nexus_search_conversations(p_user_id, p_query_embedding, p_match_count, p_since)
→ TABLE (conversation_id, content, role, created_at, distance)
```

### Python layer: semantic_memory.py

```python
save_message(user_id, role, content) -> int      # INSERT + fire embedding task
search_similar(user_id, query, k, since_days)    # embed query → RPC → filter by threshold
get_recent(user_id, limit)                       # cheap SELECT, newest first
```

- Reuses `_get_supabase()` singleton from `memory.py` — no second Supabase client.
- All Supabase calls sync → wrapped in `asyncio.to_thread()`.
- RLS DISABLED on both tables (service-only, no user JWT access).

### Migration

Apply `supabase_nexus_conversations.sql` in Supabase SQL Editor (project: nexus) before deploying Phase 1B.
See `MIGRATIONS.md` in Nexus repo for full apply order.

---

## How to verify this file

- `ls *.py handlers/*.py` — confirm file structure matches
- `git log --oneline -5` — recent activity
- `python -c "import bot"` — verify imports resolve (needs valid BOT_TOKEN in .env)

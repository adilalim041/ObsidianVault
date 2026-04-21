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

## Ideas dual-write (Phase 2, added 2026-04-21)

Every confirmed idea is now written to two stores simultaneously:

1. **Supabase** (`nexus_ideas` table via `memory.add_idea`) — primary source of truth.
2. **ObsidianVault GitHub repo** (`projects/nexus-ai/ideas/YYYY-MM-DD-HHMM-slug.md`) — human-readable backup with frontmatter.

### New files

| File | Role |
|---|---|
| `idea_vault.py` | `save_idea_to_vault()` — builds Markdown + writes via vault_github. `make_slug()` — Cyrillic-safe slug generator (unidecode). |
| `voice_transcribe.py` | `transcribe_voice(audio_path)` — Gemini Files API transcription with 2x retry on 429/500. |

### Flow

1. User sends voice message (≥3 sec) or text.
2. Voice → `transcribe_voice()` converts to text before `analyze_intent`.
3. Intent classified as `save_idea` → confirmation screen.
4. On confirm → `memory.add_idea()` (Supabase) → `save_idea_to_vault()` (GitHub).
5. If vault write fails → log WARNING, idea still saved in Supabase, user sees no error.
6. If vault write succeeds → "Открыть в vault" button with GitHub URL shown to user.

### Failure modes

- Transcription fails → bot replies "Не удалось распознать голосовое", returns early.
- Vault write fails → None returned, idea safe in Supabase, no error shown to user.
- Supabase write fails → exception propagates normally (existing behavior).

### vault_github.py retry (added Phase 2)

`write_vault()` now retries on 429/502/503/504 with exponential backoff (1s, 2s, 4s, max 3 attempts). 409 sha conflict triggers a sha re-fetch + single retry. Other 4xx fail immediately.

### Dependencies added

- `unidecode>=1.3.8` — Cyrillic transliteration for slug generation.

### Env vars required

- `VAULT_WRITE_TOKEN` — fine-grained PAT, scope ObsidianVault/Contents=R/W (already used by heartbeat).
- `VAULT_REPO` — defaults to `adilalim041/ObsidianVault`.
- `VAULT_BRANCH` — defaults to `main`.

## Daily Task Tracker (Phase 3, added 2026-04-21)

**Status:** Implemented. Feature-flagged via `DAILY_TRACKER_ENABLED=true`.

### New files

| File | Role |
|---|---|
| `daily_tracker.py` | APScheduler jobs, DB helpers, intent handlers (daily_plan / task_done_text / task_status / rest_day), carry-over logic, AI task parsing |
| `vault_summary.py` | Builds morning vault digest via GitHub Contents API (list_vault). Works on Railway (no local path needed). |
| `migrations/2026-04-21_nexus_daily_tasks.sql` | Schema: nexus_daily_tasks + nexus_daily_state |

### New Supabase tables

| Table | Purpose |
|---|---|
| `nexus_daily_tasks` | One row per task. Fields: user_id, task_date, title, status (pending/done/skipped/carried_over), source (voice/text/carried_over/manual), done_at |
| `nexus_daily_state` | One row per (user, date). Tracks is_rest_day, morning_asked_at, plan_received_at, last_pulse_at |

### Scheduler jobs (UTC, Railway = UTC, Astana = UTC+5)

| UTC | Astana | Job |
|---|---|---|
| 04:00 | 09:00 | Morning check-in + vault digest |
| 07:00 | 12:00 | Pulse 1 |
| 09:00 | 14:00 | Pulse 2 |
| 11:00 | 16:00 | Pulse 3 |
| 13:00 | 18:00 | Pulse 4 |
| 15:00 | 20:00 | Pulse 5 |
| 17:00 | 22:00 | Pulse 6 |
| 19:00 | 00:00 | Pulse 7 (end-of-day) |

### New intents in router.py

- `daily_plan` — user dictates/writes plan for today
- `task_done_text` — user says they finished something
- `task_status` — user asks what's left
- `rest_day` — user says no tasks today

### Carry-over logic

Незакрытые задачи помечаются `status='carried_over'` при вызове `carry_over_yesterday_tasks()` в момент когда пользователь создаёт новый план на следующий день (NOT в отдельной cron job). Вызов встроен в `handle_daily_plan()`.

### Env vars

```
ADIL_USER_ID=<telegram numeric id>
DAILY_TRACKER_ENABLED=true
```

### Scheduler wiring

Использует **существующий** `core.scheduler` (AsyncIOScheduler). `register_daily_tracker_jobs(scheduler)` вызывается в `bot.py` после `scheduler.start()`. Второго экземпляра планировщика нет.

---

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

## Semantic memory (Phase 1B integrated, 2026-04-21)

**Status:** Fully integrated into main_handler. Bot saves every exchange and retrieves semantic context on each message.

### Phase 1B — Integration points

**Save points in `handlers/messages.py`:**
- Immediately after receiving user text (incl. voice transcript), before `analyze_intent` → `save_message(user_id, 'user', text)`
- After each bot response (every intent branch that sends text) → `_persist_assistant(user_id, reply_text)`
- Both are best-effort: exceptions are logged as WARNING, bot continues without persistence
- FSM multi-step flows (Contact/Reminder/VideoGen) save the final outcome, not intermediate confirmation steps

**Semantic retrieval flow:**
1. Before `analyze_intent`, call `search_similar(user_id, query, k=3, since_days=None)`
2. Deduplicate against in-memory `chat_history[-8:]` via `dedupe_with_chat_history()`
3. Pass `semantic_ctx` to `analyze_intent(..., semantic_context=semantic_ctx)`
4. `router.py` formats semantic_ctx into prompt block (only if non-empty), placed between Global memory and Recent conversation

**Prompt structure in `router.py`:**
```
Global memory about the user:
{global_context}

Relevant memories from past conversations (semantic search top-3, ordered by relevance):
  1. [Nд назад, role=user]: <content truncated to 300 chars>
  2. ...

Recent conversation (last 8 messages, chronological):
{chat_history}

Current local date/time: ...
User input: ...
```

**Logging for diagnostics:**
```
[semantic] user=X query="first 50 chars..." hits=3 avg_distance=0.23
```
Visible in Railway logs. If hits=0 or avg_distance is high — retrieval is weak.

**Performance:** ~250-500ms per message added (Gemini embed ~200-400ms + Supabase RPC ~50-100ms). "Думаю..." spinner already showing, UX not impacted.

**Graceful degradation:** If Supabase is down:
- `save_message` fails silently (WARNING log), bot works without persistence
- `search_similar` returns `[]`, bot works with in-memory history only
- No crash, no user-visible error

### Commands added in Phase 1B

**`/memory stats`** — diagnostics:
```
Семантическая память:
342 сохранённых сообщения (321 с embedding).
Самое старое сообщение от 2026-03-15.
Pending embeddings: 21.
```

**`/clear`** — clears in-memory session only (as before) + shows hint about `/clear all`

**`/clear all`** — clears BOTH in-memory session AND persistent semantic memory (DELETE from both Supabase tables for this user_id). Returns count of deleted rows.

### New public API in `semantic_memory.py`

```python
clear_user(user_id) -> int                        # DELETE both tables for user, returns rows deleted
dedupe_with_chat_history(similar, chat_history)   # filter similar by content match with chat_history
get_memory_stats(user_id) -> dict                 # {total_messages, embedded_count, oldest_date}
```

### Phase 1A — Foundation (unchanged)

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

# Nexus.AI — Gotchas

### 2026-04-07 — API reliability is the main pain (current)
Same as News.AI: external API calls (image gen, AI model) are unreliable — they lag or silently fail. When something doesn't work, the first hypothesis should be "API hiccup", not "code bug". Apply the same architectural fixes as News.AI: retry with backoff, per-call logging, queue for re-processing.

### 2026-04-07 — `assistant_memory.db` contains private data — never commit, never share
Already in `.gitignore`. But worth being explicit: this DB has Adil's actual conversation history. Treat as personal data:
- Never `git add` it, even by accident
- Never copy it into the vault
- Never include its contents in logs or outputs
- If a backup is needed, encrypt at rest

### 2026-04-07 — `os_controller.py` is security-sensitive
This file executes OS commands on Adil's laptop. Before adding new capabilities, see the security note in `architecture.md`. Do NOT add a "run arbitrary shell command" feature without explicit user confirmation per call.

### 2026-04-09 — _get_conn() recursion after replace_all

When using `replace_all` to swap `sqlite3.connect(DB_PATH)` → `_get_conn()` across memory.py, the replacement also hit the function's OWN body, creating infinite recursion. Lesson: `replace_all` is dangerous when the replacement string matches the function being defined. Always check the definition itself after bulk replacements.

### 2026-04-09 — Router registration order in aiogram v3 matters

After splitting bot.py into modules with separate Routers, the order of `dp.include_router()` calls determines handler priority. FSM state handlers (forms) MUST be registered before the catch-all `main_handler`, otherwise main_handler intercepts messages meant for form steps. Current order: commands → callbacks → forms → messages.

### 2026-04-09 — RPA Computer Use was auto-executing AI-generated code

Before the audit, `generate_pyautogui_step()` output was executed immediately without user confirmation. This meant Gemini could be tricked (e.g. by a crafted website on screen) into typing commands in a terminal or pressing Win+R. Fixed: every step now shows code + 3 buttons (Execute / Skip / Stop). Also `generate_pyautogui_step` was blocking the event loop (sync call without to_thread) — fixed.

### 2026-04-20 — Don't wrap `asyncio.create_task` around a function that already returns a Task

`heartbeat.start_heartbeat_task()` returns a ready `asyncio.Task` (it calls `asyncio.create_task(...)` internally). First wiring in `bot.py` did `asyncio.create_task(start_heartbeat_task(), name="nexus_heartbeat")` — wrapping a `Task` in `create_task()` raises `TypeError: a coroutine was expected, got <Task ...>` and crashed the bot at startup on Railway (restart loop). Correct form: `start_heartbeat_task()` alone — it's already fire-and-forget. Rule of thumb: if a helper's name starts with `start_` and returns `asyncio.Task`, don't wrap it. The docstring was misleading — fixed in the same commit.

Also: this bug slipped past unit tests because tests mocked heartbeat at the module level. Lesson — for startup-path changes, do a smoke run (`python bot.py` with dummy env) before pushing.

### 2026-04-21 — Gemini embedding: `text-embedding-004` мертва на v1beta, `GEMINI_MODEL=gemini-2.0-flash` тоже

Phase 1B semantic memory зашёл на Railway и положил обе AI-системы:

1. **`text-embedding-004` → 404 NOT_FOUND** через новый `google-genai` SDK (`v1beta/:batchEmbedContents` не поддерживается). Правильная модель — **`gemini-embedding-001`** (GA 2025). Default output_dim=3072, наш pgvector schema = 768 → нужно **явно передать** `config=EmbedContentConfig(output_dimensionality=768)`. Иначе dim mismatch при INSERT в `nexus_conversation_embeddings`.

2. **`GEMINI_MODEL=gemini-2.0-flash` в Railway env** — Google отключил модель для новых пользователей. Либо `gemini-2.5-flash`, либо удалить переменную и дать коду взять дефолт.

3. **Anthropic fallback** в `router._fallback_anthropic` маскирует такие проблемы сообщением "Обе AI системы недоступны" — выглядит как падение Nexus, хотя реальная причина external API. Всегда смотреть Railway logs: `Error in Gemini API:` + `Anthropic fallback also failed:` дают точный root cause.

**Lesson для будущих интеграций embedding**: проверять `len(response.embeddings[0].values)` против ожидаемого `EMBEDDING_DIMS` сразу — fail loudly вместо записи битого вектора в БД.

---

> Add new entries as they come up.

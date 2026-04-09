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

---

> Add new entries as they come up.

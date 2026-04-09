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

---

> Add new entries as they come up.

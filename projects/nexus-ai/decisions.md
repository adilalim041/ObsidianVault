# Nexus.AI — Decisions

## 2026-04-07 — Python instead of Node (default, not deliberate)

**Context:** Adil's other two projects are Node.js. Nexus is Python.

**Decision:** Stay with Python.

**Why:** Honest answer — Nexus was started in Python and Adil doesn't know the difference between Python and Node well enough to evaluate a port. The cost of switching outweighs any gain right now.

**Consequences:**
- Nexus has different tooling, dependencies, and deployment patterns from the other projects
- Can't directly reuse code from Omoikiri / News.AI without rewriting
- Knowledge nodes about Node patterns don't apply here — for Nexus, prefer Python equivalents

---

## 2026-04-07 — Telegram bot is the only interface

**Context:** Could have been CLI, web UI, native app, voice.

**Decision:** Telegram bot only.

**Why:** Lowest-friction interface for Adil personally — already has Telegram open all day. Also: easy to demo in screenshots/videos (relevant if this gets productized — see overview.md "viral demo" note).

**Consequences:** All UX decisions are constrained by what Telegram allows (text, images, buttons, no rich custom UI).

---

## 2026-04-07 — Local SQLite for memory, not cloud DB

**Context:** Memory could live in Supabase like the other projects.

**Decision:** Local SQLite (`assistant_memory.db`).

**Why:** Simpler. Single-user. No cloud dependency means no API failures for memory access.

**Consequences:**
- Memory is tied to one machine
- If the machine dies, the memory dies with it (unless backed up)
- Cannot be a multi-user product as-is — would need migration to cloud DB if productized

---

## 2026-04-09 — Vault integration via local filesystem read, not API

**Context:** Nexus needs to read ObsidianVault data (candidates, backlogs, research reports). Could use: (a) local file reads, (b) a REST API wrapper around vault, (c) git clone from GitHub.

**Decision:** Direct local filesystem reads via `vault_reader.py`.

**Why:** Simplest approach. Bot runs on same machine as vault. No extra service to maintain. vault_reader.py is a pure reader — no writes, no state.

**Consequences:**
- Only works when bot and vault are on same machine
- If vault moves to cloud-only (e.g. GitHub), would need to switch to git clone or API
- Read-only by design — bot cannot corrupt vault data

---

## 2026-04-09 — Gemini intent classification for vault commands (not hardcoded keywords)

**Context:** Could have matched vault commands via regex ("что нового" → vault). Instead, added 3 new intents to Gemini router.

**Decision:** Use Gemini classification (same as all other intents).

**Why:** Consistent with existing architecture. Handles variations in phrasing naturally. Slash commands (/vault, /status, /research) work as direct fallback.

---

> Add new entries as decisions are made. Especially: how the OS command surface is locked down for safety, whether to migrate to a cloud DB if productizing.

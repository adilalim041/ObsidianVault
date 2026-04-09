# Omoikiri.AI — Gotchas

## Format

```
### YYYY-MM-DD — Title
What went wrong, how we found it, what to remember.
```

## Entries

### 2026-04-07 — Railway filesystem is ephemeral, kills WhatsApp sessions
Default Baileys session storage on disk dies on every Railway redeploy. Solved by moving auth state to Supabase (`auth_state` table). See [decisions.md](decisions.md).

### 2026-04-07 — Claude sometimes "fixes" the wrong code (Adil's recurring frustration)
Recurring pain: Adil asks for a fix, the AI agent edits adjacent or unrelated code and the actual bug remains. **Mitigation in this vault:** before making changes, the agent should explicitly state which file + line it intends to change and why, then act. If a fix doesn't work after one attempt, stop and re-read the original problem instead of trying random nearby code.

### 2026-04-07 — AI analyzer accuracy is "so-so" right now
The daily AI funnel-stage classifier works, but assigns stages roughly. This is a known limitation and an active backlog item. When working on it, treat it as a **prompt engineering** problem first, not a code problem.

### 2026-04-09 — ai_queue table was dead code (enqueue without consumer)
Messages were being inserted into `ai_queue` from `messageHandler.js` and `routes.js` on every message, but no process ever read from that table. The daily analysis reads `dialog_sessions` directly. Removed `queueManager.js` and all `enqueueForAI` calls. The `ai_queue` SQL table still exists in Supabase but is unused — can be dropped when convenient.

### 2026-04-09 — Telegram notifications were silently disabled
`notifyHotLead()` and `sendDailySummary()` in `notificationService.js` had `return` on line 2 with comment "Disabled until AI classification is verified". All calls from aiWorker worked but nothing was sent. Re-enabled 2026-04-09.

### 2026-04-09 — WebSocket was open to anyone
`/ws` endpoint had zero authentication — any client could connect and receive all messages in real-time. Fixed by requiring `apiKey` query param on WS connection.

### 2026-04-09 — Response tracker lost records on multi-message conversations
When a customer sent multiple messages before manager replied, only the last pending record got matched. All earlier ones stayed with `manager_response_at = null` forever, corrupting analytics. Fixed to update ALL pending records.

### 2026-04-09 — connectionReplaced not handled (ban risk)
WhatsApp sends `connectionReplaced` when account logs in on another device. Bridge fell through to generic reconnect, hammering WA servers for hours. Added explicit handler that STOPS reconnection and sends Telegram alert.

### 2026-04-09 — markOnlineOnConnect was true (ban risk)
"Always online" accounts trigger WhatsApp automation detection. Changed to `false`.

### 2026-04-09 — Identical browser fingerprints across 8 accounts (ban risk)
All 8 WhatsApp sessions had the exact same browser signature (Chrome/Desktop/125.0.6422) from the same Railway IP — a red flag for automation detection. Fixed by assigning each session a deterministic unique fingerprint from a pool of 10 real browser signatures. Fingerprint is stable across reconnects (same sessionId = same browser). **Remember:** any multi-account setup on shared infra needs per-account fingerprint diversity.

### 2026-04-09 — Stale session locks after Railway redeploy
After redeploy, the old instance's lock heartbeat was still "fresh" (<60s), so the new instance thought another instance held the lock. `acquireLock` returned false, sessions never started. Fixed with `clearStaleLocks()` that deletes all locks from other `instance_id`s before `startAll()`. Safe for single-instance Railway.

### 2026-04-09 — AI response JSON parsing was fragile
`callClaude()` was doing raw `JSON.parse` after regex-stripping markdown fences. If Claude returned slightly malformed JSON or unexpected field values, the whole analysis for that dialog would silently fail (return null). Fixed by adding Zod schemas (`src/ai/schemas.js`) with `.catch()` defaults — now invalid fields get safe defaults instead of crashing the whole parse.

---

> Add new entries here as they come up. One paragraph per entry. Include date, what went wrong, how we found it, what to remember.

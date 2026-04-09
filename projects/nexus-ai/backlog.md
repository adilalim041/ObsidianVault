# Nexus.AI — Backlog

## Done (2026-04-09)

- ~~Architectural cleanup~~ — DONE: split 2400-line bot.py into 10 modular files
- ~~Lock down os_controller.py~~ — DONE: removed trusted bypass, added hardcoded allowlist, RPA step confirmation
- ~~Add vault integration~~ — DONE: /vault, /status, /research commands + 3 Gemini intents
- ~~Security audit~~ — DONE: 22 issues fixed (SQL injection, memory leaks, auth patterns, etc.)

## Active threads

- **Rewrite media_providers.py to async** — currently uses synchronous requests + time.sleep in to_thread. Limits concurrency to ~5 parallel operations. Low priority for single user.
- **Fix API reliability** — retry with backoff on Gemini/Veo/Luma calls

## Near-term

- Add `/cancel` command to exit any FSM state (currently stuck until form completes)
- Add rate limiting on Gemini API calls (simple per-user counter)
- Add health check / uptime monitoring
- Webhook mode instead of polling for lower latency (requires public URL)

## Medium-term

- **Expand command surface** — more integrations, more vault interactions
- **Voice-to-text improvements** — currently uses Gemini audio upload, could use local Whisper
- Add Omoikiri integration (query CRM data, check WhatsApp stats via Supabase)
- Add News.AI integration (trigger content pipeline, check article status)
- Automatic SQLite backup to cloud (Supabase or GitHub)

## Long-term (if pursuing as product)

- Package as "Jarvis demo" — voice in/out, visible-on-screen actions
- Migrate memory.py to cloud DB for multi-user
- Adil's laptop-tied design becomes a problem — will need cloud deployment

## Explicitly NOT doing (yet)

- Public release before security review is complete
- Multi-user support (major rework needed)

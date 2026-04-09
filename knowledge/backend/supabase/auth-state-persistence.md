# Supabase: persisting external-service auth state in DB

## TL;DR

When you need to persist authentication state for an **external service** (WhatsApp/Baileys session, Telegram bot session, OAuth refresh tokens, scraping cookies, etc.), and your app is deployed on a host with **ephemeral filesystem** (Railway, Heroku, most container hosts) — **store the auth state in a Supabase table**, not in local files.

Local files die on every redeploy. Database rows don't.

## Why this is a recurring problem

Most SDKs that maintain a session (Baileys for WhatsApp, telegram-bot libs, OAuth client libs) default to "save the auth state to disk in `./auth_info/` or similar". This works fine on a developer laptop. It silently fails in production on any host where the filesystem doesn't survive a restart:

- **Railway** — ephemeral by default
- **Heroku** — dynos have ephemeral disk
- **Vercel serverless** — read-only FS
- **Most containerized hosts** — same

The symptom: the app worked yesterday, you redeployed, now it can't find its session, and the user has to re-scan a QR code / re-authorize / re-link.

## The pattern

1. Create a Supabase table for the auth state. Schema depends on the SDK; usually one row per session, with columns like:
   ```
   id            text primary key       -- e.g. "default" or a per-user key
   state         jsonb                  -- the serialized auth blob
   updated_at    timestamptz default now()
   ```
2. Write a small adapter layer that the SDK can plug into:
   - **Read** the state on startup → hydrate the SDK
   - **Write** the state whenever the SDK signals an update (after every change, not just on shutdown — the process can crash)
3. Wrap reads/writes in error handling. **Never** let an auth-state write failure crash the main flow silently — log loudly.

## What to watch out for

- **Serialization format.** Some SDKs store binary or `Buffer` data. JSON-serialize correctly (base64 buffers, etc.) so DB round-trips don't corrupt them.
- **Race conditions.** If the SDK can write auth state from multiple places, debounce or last-write-wins.
- **Atomicity.** Use a single row update, not delete+insert.
- **Privacy.** Auth state files are equivalent to passwords. RLS the table so only the service role can read it. Never expose this table via the public API.
- **Backup.** This row is the most important row in your DB — without it, the integration breaks. Make sure it's in your backup strategy.
- **Don't log the state contents** — they contain credentials.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Local files | Ephemeral FS kills them on redeploy |
| Railway volumes | Extra cost, single point of failure, doesn't help on other hosts |
| Redis | Another piece of infra to maintain when Supabase is already there |
| External KV (Upstash etc.) | Same — adds infra for no benefit |

The "use the database you already have" answer wins on simplicity unless you have a specific reason otherwise.

## Where this came from

Omoikiri.AI uses this pattern for WhatsApp (Baileys) auth state, stored in the Supabase `auth_state` table. Before this, redeploying `wa-bridge` to Railway killed the WhatsApp session and required a fresh QR scan. After: redeploys are transparent.

The same pattern applies anywhere — if you're integrating Telegram, OAuth flows, scraping with cookie-based sessions, etc., on a Railway-hosted Node service, default to this approach from the start.

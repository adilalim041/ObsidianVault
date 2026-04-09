# PROJECT: Omoikiri.AI

> ⚠️ This is the Omoikiri.AI project. Do not confuse with News.AI or Nexus.AI.

## Identity

- **Project name:** Omoikiri.AI
- **Repo folder name:** `wa-bridge`
- **Path on disk:** `C:\Users\User\Desktop\wa-bridge\`
- **Status:** Active
- **One-line description:** B2B marketing for Japanese kitchen sinks + WhatsApp bridge for managers

## Stack (high level)

- Node.js backend (Express)
- Supabase (auth, DB, storage) — `<SUPABASE_PROJECT_REF>`, see project `.env`
- WhatsApp integration (Baileys or whatsapp-web.js) — auth state stored **in Supabase table `auth_state`**, NOT on disk
- React dashboard (`wa-dashboard` git submodule)
- Hosting: Railway (backend), Vercel (dashboard)

## Project files in this folder

- [overview.md](overview.md) — what it does, who it's for, current state
- [architecture.md](architecture.md) — how it's built (with Last verified date)
- [decisions.md](decisions.md) — why it's built this way
- [gotchas.md](gotchas.md) — things that bit us
- [backlog.md](backlog.md) — what's next

## Key URLs (no secrets)

- **Dashboard (public):** https://wa-dashboard-blond.vercel.app
- **Backend (Railway):** internal service — name not yet documented
- **Supabase project ref:** `<SUPABASE_PROJECT_REF>` — see `wa-bridge/.env`

## Source-of-truth checklist

When the task touches:
- Database schema → check actual Supabase tables, not just `architecture.md`
- WhatsApp auth → check `src/storage/authState.js` (or wherever the current logic lives) for the real path
- Dashboard → it's a git submodule, may have its own architecture

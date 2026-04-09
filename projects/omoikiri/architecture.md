# Omoikiri.AI — Architecture

**Last verified:** 2026-04-09 (verified against code + supabase_schema.sql)

## Components

| Component | Tech | Hosting | Role |
|---|---|---|---|
| `wa-bridge` | Node.js | Railway | WhatsApp ingestion (Baileys), writes to Supabase, runs AI analyzer cron |
| `wa-dashboard` | React (git submodule) | Vercel | UI: CRM view, conversations, funnel, reports |
| Supabase | Managed | Supabase Cloud | Database (messages, contacts, tags, funnel stages, auth state), realtime, storage |
| Claude API | External | Anthropic | Daily AI analysis of conversations for funnel-stage classification |

## Public URLs

- **Dashboard:** https://wa-dashboard-blond.vercel.app
- **Backend (Railway):** internal — service name not yet documented here
- **Supabase project ref:** `<SUPABASE_PROJECT_REF>` — see `wa-bridge/.env`

## Data flow (as Adil understands it)

1. Customer sends WhatsApp message
2. **Baileys** in `wa-bridge` (running on Railway) receives the message
3. Message is written into **Supabase** (`messages` table)
4. Tags + contact mapping happen in/around Supabase — the dashboard interprets this and routes the message into the right account view and funnel column
5. **AI analyzer cron** (daily, in `wa-bridge`) reads conversations, calls Claude API, classifies them into funnel stages and tags. Logic for "qualified lead", tag assignment, etc. lives in the prompts.
6. Manager replies through the **dashboard** → record into Supabase → `wa-bridge` picks up and sends back via WhatsApp

> ⚠️ This flow is from memory. Verify against code in `wa-bridge/src/` before making changes that depend on the exact mechanism (especially the dashboard → outgoing-message path).

## WhatsApp auth state

Stored in **Supabase table `auth_state`** (NOT on disk). This is critical because Railway has an ephemeral filesystem — local sessions would die on every redeploy. See `decisions.md`.

## Supabase tables (verified from `supabase_schema.sql` 2026-04-09)

| Table | PK | Purpose |
|---|---|---|
| `messages` | `id` (bigserial), UNIQUE(`message_id`, `session_id`) | All WhatsApp messages — body, media_url, from_me, timestamp, dialog_session_id |
| `contacts` | `id`, UNIQUE(`phone`) | WhatsApp phonebook contacts (name, phone) |
| `contacts_crm` | `id`, UNIQUE(`session_id`, `remote_jid`) | CRM contacts — first_name, last_name, role, company, city, avatar_url, notes |
| `chats` | PK(`remote_jid`, `session_id`) | Chat metadata — display_name, tags[], is_muted, is_hidden, last_message_at |
| `auth_state` | PK(`key`) | Baileys credentials — session_id, type, value (survives Railway redeploy) |
| `session_lock` | PK(`session_id`) | Distributed locking — instance_id, heartbeat_at |
| `session_config` | PK(`session_id`) | WhatsApp session config — display_name, phone_number, is_active, auto_start |
| `manager_sessions` | `id`, UNIQUE(`user_id`, `session_id`) | User ↔ session binding with role |
| `dialog_sessions` | `id` (bigserial) | Dialog grouping — session_id, remote_jid, started_at, message_count, status |
| `chat_ai` | `id`, UNIQUE(`dialog_session_id`) | AI analysis — intent, lead_temperature, deal_stage, sentiment, risk_flags, summary_ru, consultation_score, customer_type, manager_issues, followup_status |
| `ai_queue` | `id` | **DEAD CODE** — messages enqueued but never consumed. Daily analysis reads dialog_sessions directly. Candidate for removal. |
| `manager_analytics` | `id` | Response time tracking — customer_message_at, manager_response_at, response_time_seconds |
| `tasks` | `id` | CRM tasks — title, due_date, task_type, priority, status, deal_value (created via AI chat) |

**Note:** `chat_ai` has extra columns beyond schema.sql (added via ALTER): `analysis_date`, `customer_type`, `consultation_score`, `consultation_details` (jsonb), `followup_status`, `manager_issues` (text[]), `stage_source`, `stage_changed_at`, `ai_tag`. The schema.sql file is outdated — actual table is richer.

## Cron jobs

- **Daily AI analysis** (`runDailyAnalysis`) — runs at 23:00 Almaty (configurable via `DAILY_ANALYSIS_HOUR`). Iterates `dialog_sessions` with activity that day, calls Claude Sonnet for each, upserts into `chat_ai`. Also runs `classifyUntaggedChats` (Haiku batch) and `reclassifyFirstContactDialogs`. Includes catch-up logic on server restart.
- **AI auto-tagging** — After each analysis, `applyAutoTag` sets chat tags based on `customer_type` (unless `tag_confirmed` by user).
- **Hot lead notifications** — Telegram notification via `notifyHotLead` when `lead_temperature === 'hot'`.
- **Morning summary** — `sendDailySummary` sends results digest to Telegram.

## Anti-ban & stability hardening (added 2026-04-09)

- **Presence cycling:** Each session alternates 20-40min online → 5-10min offline (not always-online)
- **Per-session browser fingerprint:** Deterministic from pool of 10 real signatures, stable across reconnects
- **Reconnect semaphore:** Max 2 concurrent reconnections to prevent DB/WA flood on network blip
- **Failover queue:** 5000 capacity, batched (200), persisted to disk on shutdown, restored on startup
- **Rate limiting:** 15 msg/min global, 8 per contact
- **Hard reconnect cap:** 25 attempts max, then stop + Telegram alert
- **Ban detector:** Tracks `loggedOut`/`connectionReplaced` per day, alerts at >3 incidents
- **Session locks:** Conditional UPSERT, `clearStaleLocks()` on startup for Railway redeploy safety

## Sub-projects

- `wa-dashboard/` — git submodule. Has its own deployment to Vercel. May have its own conventions; treat it as a separate codebase when making dashboard changes.

## How to verify this file is still accurate

- `ls C:\Users\User\Desktop\wa-bridge\src` — does the structure match?
- `git log -5 --oneline` in `wa-bridge` — recent activity
- For database schema questions: check Supabase dashboard or look for a `migrations/` or `schema.sql` in the repo
- For AI analyzer logic: grep for prompts in `wa-bridge/src/` (probably under `analyzer/` or similar)

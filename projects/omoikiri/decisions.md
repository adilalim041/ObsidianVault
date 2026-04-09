# Omoikiri.AI — Decisions

> ADR-style records.

## Format

```
## YYYY-MM-DD — Title
**Context:**
**Decision:**
**Alternatives:**
**Why:**
**Consequences:**
```

---

## 2026-04-07 — WhatsApp auth state stored in Supabase, not on disk

**Context:** Default Baileys/whatsapp-web.js stores session files locally. On Railway, the filesystem is ephemeral — every redeploy wipes the session and forces a new QR scan.

**Decision:** Persist `auth_state` in a Supabase table.

**Alternatives:**
- Local files (rejected: ephemeral on Railway)
- Railway volume (rejected: extra cost, single point of failure)

**Why:** Already using Supabase, and DB is durable across redeploys.

**Consequences:** Need to handle serialization carefully; auth state is now coupled to Supabase availability. Worth a [knowledge node](../../knowledge/backend/_index.md) — this pattern applies to any external-service auth that needs to survive redeploy.

---

## 2026-04-07 — No WhatsApp Business API (WABA)

**Context:** WABA is the "official" Meta-blessed way to integrate WhatsApp into business systems.

**Decision:** Use unofficial Baileys instead.

**Alternatives:**
- WhatsApp Business API (Meta) — rejected
- Twilio for WhatsApp — not seriously evaluated

**Why:** Cost. WABA charges per conversation, has approval friction, and template message restrictions.

**Consequences:**
- No official guarantees, can theoretically be banned
- Auth state is fragile (QR scan, session expiration)
- But: zero API cost, full control over message format

---

## 2026-04-07 — No no-code (n8n etc.), all custom code with AI agents

**Context:** Many CRM/automation projects start in no-code tools like n8n, Make, Zapier.

**Decision:** Build everything as custom Node code, with Claude Code (AI agents) doing most of the implementation.

**Alternatives:**
- n8n / Zapier / Make (rejected)
- Hybrid (rejected)

**Why:** Control over logic, no vendor lock-in, and Adil's leverage with AI tools makes custom code feasible without being a coder himself. Also: long-term goal is to templatize and resell — that's much harder when business logic lives in someone else's no-code platform.

**Consequences:** All bug fixes, feature additions, and infra changes are code. Adil cannot fix things by clicking — he depends on the AI agent loop.

---

> More decisions to be added as they come up. When the AI analyzer accuracy is improved, document why a particular approach was chosen. When the marketing-side is added, document how it integrates with the existing CRM tables.

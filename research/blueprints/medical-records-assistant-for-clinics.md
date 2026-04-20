---
id: 2026-04-20T154223Z-blueprint-medical-records-assistant-for-clinics
type: blueprint
source_command: system/queue/done/2026-04-20T154223Z-blueprint-medical-records-assistant-for-clinics.json
created_at: 2026-04-20
idea: medical records assistant for clinics
scaffold: false
status: draft
---

# Medical records assistant for small clinics — Blueprint

> One-line: AI assistant that ingests a clinic's existing patient records (scanned PDFs, typed notes, lab reports), indexes them, and lets clinicians search, get pre-visit summaries, and later auto-draft SOAP notes — all with forced citations and HIPAA-track compliance.

**Target user:** small clinic (2–20 clinicians), time-pressed GPs / specialists / nurse practitioners.
**Budget ceiling:** $50–300/mo per clinic.
**Build mode:** solo dev, single-tenant pilot → per-clinic Docker deploy → multi-tenant SaaS.
**Compliance posture:** HIPAA (US) / GDPR + local medical laws (EU/KZ). BAA-required components identified.

---

## 1. Problem space & user personas

Three distinct users with different pain points:

**Clinician (primary, 80% of value)** — GP, specialist, or nurse practitioner. Sees 15–30 patients/day. Current pain: before each appointment, spends 5–15 min skimming last visit notes, lab results, referral letters scattered across EHR tabs, scanned PDFs, and sometimes physical folders. Loses continuity on returning patients seen months ago by a colleague.

**Clinic admin / office manager** — Handles intake, scans paper forms, files lab reports, chases missing records. Current pain: manual data entry from paper intake into EHR; ~3–5 min per new patient; also handles record requests from other providers.

**Patient (indirect)** — Does not use the tool directly in MVP. Benefits from clinician being prepared and not repeating questions.

User stories:
1. *"As a clinician, before I walk into the exam room, I want a 30-second summary of this patient's relevant history, active meds, and last visit outcome."* — saves 5–10 min/patient.
2. *"As an admin, when I scan a paper intake form, I want it OCR'd and linked to the patient record automatically."* — saves 3–5 min/new patient.
3. *"As a clinician finishing a visit, I want to dictate 60 seconds of free speech and get a structured SOAP-style draft note I can edit and sign."* — saves 5–8 min/visit (opt-in, Phase 1+).

## 2. MVP scope — the thinnest useful slice

**v0 delivers for ONE pilot clinic, one workflow: pre-visit prep.**

**In MVP:**
1. **Document ingestion** — upload PDFs, images, and typed notes into a per-patient folder. OCR for scans. No EHR integration yet (manual upload or watch-folder).
2. **Per-patient semantic + keyword search** — clinician types a patient name, gets a chronological record view plus a search box across all that patient's docs.
3. **Pre-visit summary** — one-click generation: "summarize this patient's history, flag active meds, chronic conditions, and last visit outcome." Every claim links back to the source document + page/line. No claim without a citation.

**Explicitly NOT in MVP:**
- Auto-drafting visit notes from transcripts (Phase 1)
- EHR integrations (read/write against Epic, Athena, etc.)
- Multi-tenant SaaS — MVP is single-tenant, self-hosted or dedicated instance per clinic
- Patient-facing features, scheduling, billing
- Mobile app
- Anything that writes back into the official medical record

Success metric for v0: one pilot clinic reports >50% reduction in pre-visit prep time, zero clinically-consequential summary errors over 4 weeks.

## 3. Data flow & core architecture

```
[Admin/Clinician Upload]  [Watch Folder / Manual]  [Dictation (Phase 1)]
         |                        |                         |
         v                        v                         v
   +-----------------------------------------------------------+
   |              INGESTION SERVICE                            |
   |  - file type detect  - OCR (for scans/images)             |
   |  - text extraction   - PII tagging  - chunking            |
   +-----------------------------------------------------------+
                              |
                              v
   +-----------------------------------------------------------+
   |        STORAGE LAYER (per-clinic isolated)                |
   |  - Object store (encrypted at rest): raw files            |
   |  - Relational DB: patients, docs, users, audit log        |
   |  - Vector index + BM25 index: chunk embeddings + text     |
   +-----------------------------------------------------------+
                              |
                              v
   +-----------------------------------------------------------+
   |   RETRIEVAL ORCHESTRATOR (hybrid: vector + BM25 + rerank) |
   |   Always scoped to a single patient_id                    |
   +-----------------------------------------------------------+
                              |
                              v
   +-----------------------------------------------------------+
   |   LLM LAYER (BAA-covered provider OR self-hosted)         |
   |   - Summarize / Q&A with forced citations                 |
   |   - Refuses answers without retrieved context             |
   +-----------------------------------------------------------+
                              |
                              v
   [Clinician UI]  <--  [Auth + RBAC + Audit Middleware]
```

Cross-cutting: auth (SSO or local with MFA), per-clinic encryption keys, immutable audit log on every read/write of PHI, row-level isolation by clinic_id and patient_id. Deployable as a single Docker compose stack for pilot; Railway/Fly/self-host friendly. No cloud-specific services in the critical path.

## 4. Risks ranked

1. **Compliance / BAA (high likelihood, high impact)** — No HIPAA BAA means no US clinic can legally use this. *Mitigation:* pick an LLM provider offering BAA from day one; self-hosted option for EU/KZ; publish a compliance one-pager; engage a healthcare lawyer for ~$2–5k before pilot.

2. **Hallucination on medical facts (high × high)** — LLM invents allergies, doses, or dates. Could directly cause harm. *Mitigation:* retrieval-only answers with mandatory inline citations to source doc + location; UI makes unsourced claims impossible; ship as "assistive reference," never the medical record; loud disclaimers; red-team with clinician-written test set before every release.

3. **Incorrect summaries leading to patient harm (medium × catastrophic)** — Even cited summaries can mislead by omission. *Mitigation:* summaries always show the underlying timeline alongside; clinician signs off; log every summary shown; evaluation harness measuring recall on critical facts (allergies, meds, chronic dx) against gold-standard charts.

4. **Data breach (medium × catastrophic)** — PHI leak ends the company. *Mitigation:* encryption at rest and in transit; per-clinic key separation; MFA mandatory; least-privilege access; quarterly pen test once paid customers exist; cyber insurance by Phase 1.

5. **Market fit — small clinics vs hospitals (high × high)** — Small clinics are cheap, slow-moving, skeptical, have low IT capacity. Big hospitals have budget but demand enterprise sales. *Mitigation:* pick 3 pilot clinics via personal network before building; charge from month one (even $50) to filter tire-kickers; stay single-tenant until 5 paying clinics prove willingness-to-pay and onboarding is <1 day of Adil's time.

## 5. Roadmap

**Phase 0 — Pilot (2 weeks, 1 clinic, unpaid or token fee):**
Single-tenant Docker stack. Manual upload, OCR, per-patient search, pre-visit summary with citations. Deployed on a dedicated VM for one friendly clinic (ideally in Adil's network). No BAA yet — use de-identified or synthetic data, or operate in a jurisdiction where a handshake pilot is legal. Goal: prove the 5–10 min/patient time save is real. If it isn't, kill the project.

**Phase 1 — Compliance-ready, 5 clinics (3 months after successful pilot):**
Sign LLM BAA. Add: audit log UI, RBAC (clinician/admin/owner), MFA, backup + disaster recovery runbook, self-serve onboarding script. Add dictation-to-SOAP-draft as second feature. Price: $150–250/clinic/month. Still single-tenant-per-clinic (one Docker stack per customer) — expensive on ops but defensible on compliance and lets Adil ship without building true multi-tenancy yet. Solo-dev realistic: 3 months is tight; 4–5 is honest.

**Phase 2 — Multi-tenant SaaS (6–12 months after Phase 1):**
True multi-tenant backend with hard per-clinic isolation (separate schemas or separate DBs per tenant). Public signup, self-serve billing, status page, SOC 2 Type I in progress. First EHR integration (likely FHIR read-only) to reduce upload friction. Hire first contractor (ops/support) at ~15 paying clinics. Decision point at Phase 2 end: double down on clinics, or pivot upmarket to small hospital groups if unit economics demand it.

---

## 6. Stack picks (with reasons)

**Runtime: Node.js (TypeScript)**
Why: All three of Adil's active projects run Node; the learnings base (66+ entries) is Node-centric; the library cards for queues, logging, validation, and AI orchestration are all Node-first. Switching to Python adds a second runtime to maintain solo.
Alternative considered: Python — the only Python project is Nexus.AI (Telegram bot), separate concern domain; medical records processing does not justify the context switch.

**Framework: Fastify**
Why: Fastify's schema-first route definitions (JSON Schema / Zod via plugins) enforce input validation at the framework boundary — critical when PHI enters the system. Significantly faster than Express under load and first-class TypeScript support.
Alternative considered: Express — already used in Omoikiri.AI and News.AI, familiar, but no built-in schema validation; every endpoint needs manual Zod middleware wiring, error-prone for a regulated product.

**Database: Supabase (managed Postgres on AWS us-east-1)**
Why: Supabase has signed BAA agreements for HIPAA compliance on its Pro/Enterprise tier (verify current tier requirements). Adil already has patterns for Supabase RLS, supabase-js, type generation across all three projects. Row-level security policies enforce clinic isolation at the DB layer.
Alternative considered: Self-hosted Postgres on Fly.io — full control but requires managing encryption at rest, backups, and WAL manually; not viable for a solo dev targeting HIPAA.

**Vector store: pgvector on the same Supabase instance**
Why: Keeps the stack at one database. Learnings documents the IVFFlat index pattern (`lists=50` for 600–5000 rows, re-create at 10k+) and cosine similarity RPC pattern from News.AI caption dedup — directly transferable.
Alternative considered: Pinecone — better at scale, but separate data processor under HIPAA requiring its own BAA; adds $70+/mo and another compliance surface at MVP stage.

**OCR: AWS Textract**
Why: AWS signs HIPAA BAAs covering Textract. Outperforms Tesseract on scanned clinical documents (handwriting, low-res faxes) without self-hosting. Structured form extraction useful for intake forms and lab results.
Alternative considered: Google Vision API — HIPAA-capable via Google Cloud Healthcare API BAA, but not via standard Vision API (verify). Tesseract is free but accuracy on scanned paper clinical records is unacceptable for production.

**LLM provider: Anthropic (Claude)**
Why: Anthropic offers HIPAA BAA for Claude API (verify exact coverage tier before signing — may require enterprise agreement). Adil has active anthropic-sdk usage in Omoikiri.AI. Claude's 200k context window handles large patient record dumps. Prompt caching reduces cost on repeated system prompts (clinic-specific instructions).
Alternative considered: OpenAI GPT-4o — HIPAA BAA via enterprise; comparable capability, but Adil has more established patterns with Anthropic SDK.

**LLM orchestration: Vercel AI SDK**
Why: Library card rates it 10/10 for Node services — "THE library" for Node AI orchestration. `generateObject` + Zod pattern is exactly what's needed to produce structured SOAP-note output from voice transcripts.
Alternative considered: LangGraph (JS) — powerful for multi-step agentic flows, heavyweight for what is essentially RAG + structured output; adds debugging surface for solo dev.

**File storage: AWS S3 (us-east-1, same region as Supabase)**
Why: S3 is covered under AWS BAA. Server-side encryption with SSE-KMS (customer-managed keys) is one configuration toggle. Supabase Storage is built on S3 but abstracts KMS — for HIPAA the direct S3 path gives explicit encryption control.
Alternative considered: Supabase Storage — easier to integrate, but KMS key management less explicit; BAA coverage for Supabase Storage specifically (vs DB tier) should be independently verified.

**Job queue: graphile-worker**
Why: Library card rates 9/10 and explicitly says "probably the better choice over BullMQ given Adil's existing Postgres setup." OCR jobs, embedding jobs, voice transcription jobs run against the same Postgres — no additional Redis infra to secure or pay for. Fewer data stores in HIPAA scope = smaller attack surface.
Alternative considered: BullMQ — better ecosystem and UI tooling (Bull Board), but requires Redis (another HIPAA-scope service).

**Auth: Supabase Auth**
Why: Already integrated in Adil's stack. Learnings documents JWT verification via `jose` with JWKS, ES256 key handling, dual-auth middleware pattern — all directly applicable. Clinic-scoped RLS sits on top of Supabase Auth user IDs cleanly.
Alternative considered: Auth0 — more enterprise MFA options, but adds $0–$23/mo per active user at small clinic scale, another BAA, fresh SDK.

**Logging: Pino**
Why: Library card 10/10, standard across all Adil's Node services. Per-API-call logging pattern (provider, latencyMs, outcome, requestId) maps directly to audit log requirements.
Alternative considered: Winston — slower, less structured by default, no advantage.

**Hosting: Fly.io (machines in us-east-1, private networking)**
Why: Fly.io machines run in dedicated VMs (not shared containers), support private networking with no public IP for internal services. Substantially easier for HIPAA than Railway (Railway does not currently offer BAA). Private networking means OCR worker, embedding worker, and API never expose internal ports to the internet.
Alternative considered: Railway — familiar, simpler DX, but does not sign HIPAA BAA as of knowledge cutoff (verify). Vercel excluded for same reason + serverless-only (graphile-worker requires persistent process).

## 7. Security & compliance design

**HIPAA BAA availability (verify all before signing contracts):**

| Provider | BAA available | Notes |
|---|---|---|
| Anthropic (Claude API) | Yes — verify enterprise tier | BAA available for API customers; confirm whether standard or enterprise plan required |
| AWS (Textract + S3) | Yes | Standard AWS BAA covers both services |
| Supabase (Pro+) | Yes — verify Storage tier | DB/Auth covered; confirm Supabase Storage explicitly named in BAA |
| OpenAI | Yes — verify enterprise | Available under enterprise agreements |
| Google Cloud Vision | Uncertain — verify | Standard Vision API may NOT be covered; Healthcare API BAA is a separate product |
| Railway | No BAA known | Do not use for this product |
| Vercel | No BAA known | Do not use for backend services |
| Fly.io | Uncertain | Contact Fly sales; evaluate whether dedicated VM isolation satisfies requirements without formal BAA |

**Encryption at rest:**

- Supabase Postgres: encrypted at rest by AWS (AES-256) at infrastructure layer; row-level encryption for `ocr_text` and note content using `pgcrypto` with a clinic-specific encryption key stored in AWS KMS (not in the DB). This ensures a compromised DB dump does not expose PHI in plaintext.
- S3 documents: SSE-KMS with a customer-managed key per clinic. Key rotation 365 days. Bucket policy denies all `s3:GetObject` requests lacking server-side encryption headers.
- Encryption in transit: TLS 1.2+ enforced at load balancer for all external traffic. Internal Fly.io private network traffic stays on the encrypted WireGuard mesh.

**Audit log schema:**

```sql
audit_events (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid         NOT NULL REFERENCES clinics(id),
  user_id       uuid         NOT NULL REFERENCES users(id),
  event_type    text         NOT NULL,   -- 'document.uploaded', 'document.viewed', 'chat.query', 'user.login', 'user.logout', 'record.exported'
  resource_type text,                    -- 'document', 'patient', 'chat_session'
  resource_id   uuid,
  ip_address    inet,
  user_agent    text,
  metadata      jsonb,                   -- event-specific fields (doc_id, query hash, ocr_job_id, etc.)
  created_at    timestamptz  NOT NULL DEFAULT now()
)
```

Retention: 6 years (HIPAA minimum). Rows are append-only — no UPDATE or DELETE permissions granted to the application role. A separate read-only role for compliance exports.

Mandatory events: document upload, document download/view, OCR job start/complete/fail, chat query (log question hash, not plaintext, unless explicitly opted in), patient record access, user login, user logout, session token revocation, permission change, failed auth attempt.

**Access control model:**

Three-level isolation enforced via Supabase RLS:

1. `clinic_id` on every PHI-containing table. RLS policy: `clinic_id = auth.jwt() -> 'clinic_id'` (clinic_id embedded in JWT claims at login).
2. `clinician` role within a clinic can read/write their own patients' records. `clinic_admin` role can manage all patients and users in the clinic.
3. No cross-clinic queries are possible at the API level — every query scoped to `auth.jwt() -> clinic_id`. Service-role key never exposed to client; used only in background workers which run with explicit `clinic_id` parameter.

Patient isolation: `documents` and `chat_sessions` reference `patient_id`. A clinician must have an explicit `patient_assignments` row (or `clinic.open_records = true`) to access a patient's documents.

**Gotchas from learnings relevant to this stack:**

- Supabase `.maybeSingle()` returns null (not error) on 0 rows — use this as the "not found" primitive for access checks; never infer "no error = found".
- Supabase RLS with service_role key bypasses all RLS — the OCR worker must explicitly scope all queries to the target `clinic_id` in WHERE clauses, never rely on RLS when using service_role.
- Transaction-mode pgBouncer (port 6543) invalidates session-level advisory locks silently — if using pg advisory locks for job coordination, connect via direct DB URL (port 5432).
- `jose` JWKS: always set both `issuer` and `audience` in `jwtVerify()` to reject tokens from other Supabase projects. Omoikiri.AI confirmed ES256 (EC P-256).
- Prompt injection from uploaded documents: patient record text is untrusted input going into LLM prompts. Apply the three-layer defense: XML-tag the document content, XML-escape it, add security directive at end of system prompt.
- OCR text in `ocr_text` should be encrypted at the application layer (pgcrypto) before storage, not stored as plaintext — Supabase Pro encryption is infrastructure-level only; a Supabase support engineer with DB access sees plaintext.

## 8. API surface (sketch)

```
POST   /auth/login                    — {email, password, clinic_id} → {access_token, expires_in}
POST   /auth/logout                   — invalidates session, writes audit event

POST   /documents                     — multipart upload (PDF/image), {patient_id?} → {doc_id, status: "queued"}
GET    /documents/:id                 — {doc_id, status, ocr_text?, indexed_at?, patient_id, created_by}
GET    /documents?patient_id=&limit=  — paginated document list for a patient
DELETE /documents/:id                 — soft-delete (sets deleted_at), writes audit event

POST   /patients                      — {name, dob, external_id?} → {patient_id}
GET    /patients/:id                  — patient metadata (no PHI documents inline)
GET    /patients?search=              — name/id search within clinic

POST   /chat                          — {question, patient_id?, session_id?} → {answer, citations: [{doc_id, excerpt, page?}], session_id}
GET    /chat/sessions/:session_id     — full message history for a session

POST   /voice/transcribe              — audio file upload → {transcript, soap_note: {subjective, objective, assessment, plan}}

GET    /audit?from=&to=&user_id=      — paginated audit events (clinic_admin only)
```

12 routes covering the full MVP. Voice-to-SOAP included as a single endpoint because it is a key differentiator and Vercel AI SDK `generateObject` + Zod makes the SOAP structure trivial to enforce.

## 9. Data model (sketch)

```sql
clinics (
  id             uuid        PK,
  name           text        NOT NULL,
  plan           text        DEFAULT 'trial',         -- 'trial'|'pro'|'enterprise'
  baa_signed_at  timestamptz,
  settings       jsonb,                               -- open_records, timezone, etc.
  created_at     timestamptz DEFAULT now()
)

users (
  id             uuid        PK,                      -- matches Supabase Auth user id
  clinic_id      uuid        NOT NULL REFERENCES clinics(id),
  role           text        NOT NULL,                -- 'clinician'|'clinic_admin'
  full_name      text,
  created_at     timestamptz DEFAULT now()
)

patients (
  id             uuid        PK,
  clinic_id      uuid        NOT NULL REFERENCES clinics(id),
  full_name      text        NOT NULL,
  dob            date,
  external_id    text,                                -- EHR system ID if applicable
  created_at     timestamptz DEFAULT now()
)

documents (
  id             uuid        PK,
  clinic_id      uuid        NOT NULL REFERENCES clinics(id),
  patient_id     uuid        REFERENCES patients(id),
  uploaded_by    uuid        NOT NULL REFERENCES users(id),
  mime_type      text        NOT NULL,
  storage_path   text        NOT NULL,                -- S3 key, never a public URL
  ocr_text       bytea,                               -- encrypted via pgcrypto, NULL until OCR done
  ocr_text_iv    bytea,                               -- IV for AES-GCM decryption
  status         text        DEFAULT 'queued',        -- 'queued'|'processing'|'indexed'|'failed'
  page_count     int,
  indexed_at     timestamptz,
  deleted_at     timestamptz,
  created_at     timestamptz DEFAULT now()
)

document_chunks (
  id             uuid        PK,
  document_id    uuid        NOT NULL REFERENCES documents(id),
  clinic_id      uuid        NOT NULL REFERENCES clinics(id),
  chunk_index    int         NOT NULL,
  chunk_text     text        NOT NULL,                -- plaintext for vector search (consider encryption tradeoff)
  embedding      vector(1536),                       -- text-embedding-3-small
  created_at     timestamptz DEFAULT now()
)
-- CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

chat_sessions (
  id             uuid        PK,
  clinic_id      uuid        NOT NULL REFERENCES clinics(id),
  patient_id     uuid        REFERENCES patients(id),
  created_by     uuid        NOT NULL REFERENCES users(id),
  created_at     timestamptz DEFAULT now()
)

chat_messages (
  id             uuid        PK,
  session_id     uuid        NOT NULL REFERENCES chat_sessions(id),
  clinic_id      uuid        NOT NULL REFERENCES clinics(id),
  role           text        NOT NULL,                -- 'user'|'assistant'
  content        text        NOT NULL,
  citations      jsonb,                               -- [{doc_id, chunk_id, excerpt}]
  created_at     timestamptz DEFAULT now()
)

audit_events (
  id             uuid        PK,
  clinic_id      uuid        NOT NULL REFERENCES clinics(id),
  user_id        uuid        NOT NULL REFERENCES users(id),
  event_type     text        NOT NULL,
  resource_type  text,
  resource_id    uuid,
  ip_address     inet,
  metadata       jsonb,
  created_at     timestamptz DEFAULT now()
)
```

## 10. Cost & capacity napkin math

**Assumptions:** 1 clinic, 500 documents (~3 pages avg = 1,500 pages), 50 queries/day, 30 days/month.

| Component | Monthly cost |
|---|---|
| S3 storage (250 MB) | <$1 |
| OCR (steady-state, 20 new docs) | $0.10 |
| LLM — Claude Sonnet 4.5 (1,500 queries) | $17 |
| Embeddings (new chunks) | $0.05 |
| Supabase Pro | $25 |
| Fly.io (API + worker) | $10 |
| **Total** | **~$53/mo** |

One-time ingestion: OCR $2.25, embeddings $0.02.

At $50–300/mo/clinic pricing, margin is strong. Switching chat to Claude Haiku 4.5 (Sonnet only for complex summaries) drops LLM to ~$3–5/mo → ~$40/mo total.

---

## 11. Key screens (wireframe in words)

### Screen 1: Login
Full-viewport centered card (shadcn Card, max-width 420px). Clinic logo at top. Two fields: email + password (large text, min 16px labels). "Sign in" button full-width, primary. Below: "Forgot password?" link. No social auth in MVP. Background: neutral gray (not white) to reduce eye strain under fluorescent exam-room lighting.

### Screen 2: Patient List / Dashboard
Three-zone layout at 1280px+:

```
Top bar (64px): clinic logo | search-all-patients (full-width) | [+ New Patient] | clinician avatar/logout
──────────────────────────────────────────────────────────────────────────────────────────────────────
Left rail (280px):
  - "Today's schedule" (ordered by appt time)
  - Each row: patient name, time, visit reason tag
  - Colored dot: green=checked in, gray=scheduled, amber=waiting
  - Click → opens Patient Workspace

Main area:
  - Default: "Recently viewed patients" grid (shadcn Cards, 3 cols)
  - Card: name, DOB, last visit date, primary condition tags
  - Sorting: Last visit / Last name / Upcoming appt
  - TanStack Table view toggle for list-dense mode
  - Empty state: unDraw illustration + "Upload first records" CTA
```

### Screen 3: Patient Workspace (primary screen, 80% of clinician time)

```
Left col (240px):
  - Patient name + DOB + MRN (always visible, large)
  - Quick facts sticky card:
    - Allergies (red badge list)
    - Active medications (stacked pills)
    - Last visit date + clinician
    - Upcoming appointment
  - Divider
  - Record timeline (vertical, newest-first)
    - Doc type icon (Lucide), date, source ("Dr. Kim / Referral")
    - Click → jumps to cited excerpt in main area
  - [Upload records] button at bottom

Center col (flex, min 500px): AI Query Interface
  - Sticky top: patient breadcrumb + "Pre-visit summary" shortcut (amber, prominent)
  - Chat input PINNED AT TOP (clinicians look at top):
    - Placeholder: "Ask anything about this patient..."
    - Send on Enter, Shift+Enter for newline
    - Mic icon for voice-to-text query
  - Response thread, newest at top
  - AI response card:
    - Answer text (16px min)
    - Sources section with citation chips (doc name + date)
    - Click citation → highlights source excerpt in right rail + inline snippet
    - Amber "AI-generated — verify" badge on every response
    - Thumbs up/down feedback
  - Suggested queries below input (3 chips, auto-generated): "Recent lab trends", "Medication changes last 6 months", "Chief complaints history"

Right col (280px): Source Viewer
  - Default: most recent uploaded doc preview (PDF/image)
  - On citation click: jumps to excerpt, highlighted yellow
  - Toolbar: zoom, page navigator, download
  - Toggle: "Source view" | "Timeline view"
  - Timeline view: chronological list of clinical events extracted from records
```

### Screen 4: Upload Flow

```
Top: "Upload Records for [Patient Name]" + back link

Zone 1: Drag-drop (shadcn + react-dropzone)
  - Large dashed rectangle, 60% viewport height
  - Lucide "upload-cloud" icon
  - "Drop files here — PDF, JPG, PNG, DOCX supported"
  - "or click to browse" link

Zone 2: Upload queue (TanStack Table)
  - filename | type | size | status (uploading/processing/done/error)
  - Progress bar per row
  - Status: "Extracting text..." → "Indexing..." → "Ready" ✓
  - Errors inline (red badge + retry)
  - Bulk: remove errors, retry all

Footer:
  - [Done — go back to patient] (disabled until ≥1 file Ready)
  - "3 of 4 processed"
```

### Screen 5: Pre-visit Summary View
Full main-area takeover (rails collapse to icons):

```
Top: Patient name + "Pre-visit Summary" heading
     "Generated 2 minutes ago" | [Regenerate] | Print button

Content (single scrollable column, max-width 720px):
  1. "Chief reason for today's visit" — from appointment or last comm
  2. "Since last visit" — bullet list of interval events (new meds, labs, referrals)
  3. "Active problems" — numbered list
  4. "Current medications" — table (med | dose | prescriber | since)
  5. "Allergies & alerts" — red-highlighted box, always first-seen
  6. "Recent labs" — key values with trend arrows (Tremor sparklines)
  7. "Pending items" — overdue referrals, unsigned orders, missing-info warnings

Every section has a "Sources" disclosure (collapsed):
  - Click → expands raw source text with links back
  - AI badge on entire summary header

Footer: [Open full workspace] | [Print] | [Mark as reviewed]
```

### Screen 6: Settings / Admin
Split: left nav (200px) + right content.

- Clinic profile (name, address, logo)
- Team members (TanStack Table: name | email | role | last active | [remove]; Invite dialog)
- Integrations (placeholder — future EHR webhooks)
- Billing / subscription (placeholder)
- Security (session timeout, audit log access)
- Audit log page (filterable table: who | action | patient | timestamp; CSV export — HIPAA requirement)

## 12. Frontend stack picks

- **Framework: React + Vite** — not Next.js. Clinic-internal SPA behind auth, no SEO/SSR. Vite = fastest dev cycle, simplest deploy.
- **Component library: shadcn/ui** — library card 10/10, default for Adil's dashboards. Owned code = customizable to medical-appropriate neutrals. Radix primitives guarantee WCAG focus management.
- **Tables: TanStack Table** — library card: "if there is a table in any dashboard, use this." Patient lists, upload queues, audit logs, medication tables.
- **Forms: react-hook-form + Zod** — industry standard, minimal re-renders, schema validation at form boundary. Zod schemas double as backend contract.
- **State: Zustand** — lightweight, sufficient. Global state: current patient context, session/auth, citation highlight sync. Redux overkill; context insufficient for cross-column sync.
- **Chat/AI response UI: Vercel AI SDK (`useChat`)** — library card 10/10. Handles streaming, loading, message history. Custom rendering on top for citations and badges.
- **File upload: react-dropzone** — minimal, composable, headless. Pairs with shadcn drag-drop design. Uppy is heavier with built-in UI that conflicts with shadcn.
- **Auth UI: Custom shadcn forms against Supabase Auth** — not Clerk (unnecessary paid dep), not Supabase prebuilt widgets (not customizable enough for medical-grade). shadcn Input + Button + react-hook-form + `signInWithPassword`.
- **Charts: Tremor** — library card endorses it for sparklines and KPI trends. Lab value trend arrows in pre-visit summary.
- **Icons: Lucide** — library card default. 1500+ MIT icons, React-ready, covers medical-adjacent (file-text, upload-cloud, stethoscope, alert-triangle, clipboard).

## 13. Clinician-specific UX patterns

**1. Citation-first answers, never bare assertions.** Every AI response shows what doc it came from, which page, what the original text said. A bare "Patient is allergic to penicillin" is unusable — clinicians must verify against source before acting. Citations are clickable chips directly under each sentence, not collapsed footnotes. No source → UI must say "no source found — do not rely on this."

**2. Zero-click pre-visit access from the schedule.** Left-rail today-schedule opens pre-visit summary in ONE click, not via patient workspace first. Clinicians have 90 sec between patients. Pre-generate summaries 30 min before scheduled appt so they're ready, not computed on-demand.

**3. Keyboard-first navigation.** All frequently-repeated actions have always-visible keyboard shortcuts (not hidden in tooltips):
- `Cmd/Ctrl + K`: global patient search (cmdk)
- `Cmd/Ctrl + Enter`: submit query
- `Tab` through citations
- `P`: pre-visit summary for current patient
- `U`: upload flow for current patient
- Shortcuts bar: thin strip at bottom ("? for shortcuts")

**4. Progressive disclosure.** Pre-visit summary and AI answers default to concise top-level. Every section has "Show detail" expanding raw source text. Scanning clinicians see synthesized bullet only. Verifying clinicians expand inline without leaving page. Never paginate within a patient record — scroll is fine, new page is cognitive break.

**5. Persistent patient context, no accidental switching.** Active patient unmistakably visible at all times (name + DOB in left-rail header, never disappearing). Switching = explicit action (different patient click or search). If query text contains a different name than active patient → "Wrong patient?" warning (simple name-matching heuristic). No silent context switching.

## 14. Accessibility & safety gates

**Typography / legibility:**
- 16px body minimum, 14px only for metadata. Never smaller.
- Line-height 1.6 for paragraph text. Medical records can be dense.
- Font: Inter (Google Fonts) — highest legibility at small sizes.
- WCAG AA minimum; AAA for critical elements (allergy alerts, AI badges, errors).
- Never rely on color alone — every color-coded status has an icon and text label.

**AI-generated content badges:**
- Every LLM-produced content carries persistent amber "AI-generated — verify before acting" badge per-response. Cannot be dismissed globally.
- Pre-visit summaries: full-width banner "This summary was generated by AI from uploaded records. It may be incomplete or incorrect. Always verify with original documents before clinical decisions."
- Amber chosen to be distinct from success-green and error-red — means "caution, human review required," not "wrong."

**Confirmation gates:**
- Delete document: shadcn AlertDialog with patient + doc name spelled out. Two-step: first shows dialog, second click ("Yes, permanently delete") executes. No undo.
- External export (future): dialog stating exactly what, where, who requested.
- Remove team member: confirmation with name + "This person will lose all access immediately."

**Session / access safety:**
- Auto-lock after 10 min inactivity — blur overlay "Session locked — re-enter password." Data not lost; session preserved.
- Every patient record access logged (HIPAA requirement). Audit log visible to admins in Settings.
- No patient data in URL query strings — opaque UUIDs in path only, never names or MRNs.

**Error states:**
- AI query fails: input persists, error toast "Query failed — try again" + retry button. Never clear query field on failure.
- Document processing fails: stays in queue with red "Processing failed" + per-file retry. Clinician not sent back to start.
- Network offline: top-bar amber banner "Connection lost — working from cached data. Some features unavailable." No silent failures.

**Tablet / bedside adaptations:**
- Viewport 768–1024px (tablet landscape): left rail → icon-only (40px), right source panel → swipe-up drawer. Center query interface full-width.
- Touch targets: 44x44px minimum (WCAG 2.5.5).
- No hover-only states — all hover interactions also tap-triggered.

---

## Open questions for Adil

Before committing to this, decide:

1. **Geography & regulation.** US-first (hard HIPAA), EU (GDPR + member state laws), KZ or CIS (easier path but smaller TAM)? Informs whether Fly.io + Textract + Anthropic-BAA is the right first-day stack, or whether you can start EU/KZ on Supabase + self-host OCR.
2. **Distribution.** Do you have 1–3 friendly clinics to pilot within 2 weeks? If not, the Phase 0 assumption breaks — either line them up first or pivot to a market with faster-cycle adoption (mental-health private practices, vets, dental?).
3. **Voice-to-SOAP in MVP?** The architect put it in Phase 1. Backend included a `/voice/transcribe` endpoint. It's a strong differentiator but doubles pilot scope. Keep out of v0 — fine unless a pilot clinic explicitly asks for it.
4. **Legal budget.** Healthcare lawyer for BAA review is ~$2–5k. Is this budget available before the first paid clinic? If not, start EU/KZ or accept a longer unpaid pilot.
5. **Scaffold now?** This blueprint is design-only (`scaffold: false` in the queue command). If you want a minimal `projects/blueprints/medical-records-assistant/` skeleton generated (Fastify project init, Supabase schema migrations, Docker compose), re-run with `/blueprint medical records assistant for clinics --scaffold` or just ask.

---

## Provenance

- **Architect:** `Plan` subagent (sections 1–5)
- **Backend:** `backend-dev` subagent (sections 6–10), library cards consulted: anthropic-sdk, vercel-ai-sdk, pg-boss/graphile-worker, pino, supabase patterns from learnings
- **Frontend:** `frontend-dev` subagent (sections 11–14), library cards: shadcn-ui, tanstack-table, tremor, lucide-icons, react-hook-form + zod
- **Merged by:** `/queue-drain` orchestrator, Claude Opus 4.7
- **Command:** `2026-04-20T154223Z-blueprint-medical-records-assistant-for-clinics` (from Nexus, Adil)

# News.AI (AdilFlow) — Decisions

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

## 2026-04-07 — Microservices instead of monolith

**Context:** Pipeline could have been a single Node app with cron jobs.

**Decision:** Split into 6 independent services (`brain`, `parser`, `generator`, `publisher`, `dashboard`, `TemplateV1`), each its own git repo on GitHub, each deployed separately on Railway.

**Alternatives:**
- Single monolith (rejected)
- Modular monolith (not seriously considered)

**Why:**
1. **Independent improvement** — each service can evolve without touching the others
2. **Reusability across projects** — each service is designed so it could be lifted into a different future project. This is a strategic bet, not just architectural taste.

**Consequences:**
- Higher operational complexity (6 deployments instead of 1)
- Inter-service contracts must be designed and maintained
- gitlinks at the parent level mean checkpointing is multi-step (see safety checkpoint pattern)
- **But:** if even 1-2 services get reused in another project, the architecture pays for itself

---

## 2026-04-07 — Custom orchestration, not n8n

**Context:** n8n / Make / Zapier are common choices for content pipelines.

**Decision:** Build the orchestration layer (`brain`) as custom Node code.

**Alternatives:**
- n8n (rejected)
- Other no-code automation (rejected)

**Why:** Same reason as Omoikiri — control, no vendor lock-in, AI agents can extend custom code easily.

**Consequences:** All workflow logic lives in code. Changes require a deploy, not a click.

---

## 2026-04-07 — DALL-E rejected for image generation

**Context:** Tried DALL-E early on for image generation.

**Decision:** Use Gemini (latest available) instead.

**Alternatives:** DALL-E (rejected: quality didn't meet bar), other providers not yet evaluated systematically.

**Why:** DALL-E output quality was unsatisfactory for the social-content use case.

**Consequences:** Locked into Gemini for now. Should re-evaluate as the model landscape changes.

---

## 2026-04-07 — No off-the-shelf template editor

**Context:** There are commercial template-editor tools (Canva API, Bannerbear, etc.) that could solve the "image + variable text" problem.

**Decision:** Built **TemplateV1** as a custom standalone service.

**Alternatives:** Canva, Bannerbear, similar commercial template engines (rejected).

**Why:**
- Cost
- Independence (TemplateV1 itself is intended to be reusable)
- Full control over how variables map into the layout

**Consequences:** TemplateV1 is now an asset that has to be maintained, but it's also one of the things that could be the most reusable in future projects.

---

## 2026-04-07 — Aim for per-task LLM specialization (in progress)

**Context:** Most pipelines pick one LLM and use it for everything.

**Decision (intent):** Use a specialized LLM for each task — image, prompt writing, headlines, classification, etc. — picked for fit, not convenience.

**Status:** Not fully implemented. Currently: Gemini for images, GPT-4-mini as a placeholder for prompts/headlines. Will iterate.

**Why:** Per-task model fit usually yields better quality at lower combined cost than one-size-fits-all.

**Consequences:** Architecture must support multi-provider config cleanly. This is a constraint on how `brain` and `generator` are designed.

---

## 2026-04-09 — Dashboard migrated from vanilla HTML to React SPA

**Context:** Dashboard was a single 407-line HTML file with inline JS. Needed multi-page navigation, article browsing, playbook editing.

**Decision:** Migrate to React 18 + Vite 5 + Tailwind 3 + shadcn/ui + Tremor + TanStack Table + lucide-react. Multi-stage Dockerfile.

**Alternatives:** Keep vanilla HTML (rejected — unmaintainable at scale), htmx (rejected — not enough for complex forms).

**Why:** Matches TemplateV1 client stack. shadcn/ui is the vault-recommended UI library (score 10/10). Tremor for analytics charts. TanStack Table for sortable data tables.

**Consequences:** Dashboard now has a build step (Vite). Deploy requires multi-stage Dockerfile. But UI quality is production-grade.

---

## 2026-04-10 — Prompts managed via Brain playbooks, not hardcoded

**Context:** All AI prompts (system prompt for headline generation, Gemini image prompt, user prompt template) were hardcoded in Generator's server.js. Changing prompts required code deploy.

**Decision:** Store prompts in Brain's `content_playbooks` table (`system_prompt`, `image_system_prompt`, `user_prompt_template`). Generator loads them via `/api/config/resolve`. Dashboard Playbooks page lets Adil edit them live.

**Alternatives:** .env variables (rejected — too limited), separate prompt service (rejected — overkill).

**Why:** Adil needs to iterate on prompts per niche without code deploys. Different niches need different tones, languages, and styles.

**Consequences:** Generator falls back to hardcoded defaults if playbook prompt is null. Playbooks are per-niche — each niche can have its own editorial style.

---

## 2026-04-10 — p-retry@6 + p-queue@8 (not latest versions)

**Context:** Latest p-retry@8 requires Node>=22, Railway uses Node 18 via Nixpacks.

**Decision:** Use p-retry@6 (Node>=16) + p-queue@8 (Node>=18). Same API, works everywhere.

**Why:** Railway may ignore Dockerfile and use Nixpacks with Node 18. Downgrading avoids the issue entirely.

---

> Add new entries here as decisions are made. Especially important: when the brand name is finalized, when the first publishing target is locked in, when an AI model is changed.

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

> Add new entries here as decisions are made. Especially important: when the brand name is finalized, when the first publishing target is locked in, when an AI model is changed.

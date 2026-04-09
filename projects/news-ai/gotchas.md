# News.AI (AdilFlow) — Gotchas

## Format

```
### YYYY-MM-DD — Title
What went wrong, how we found it, what to remember.
```

## Entries

### 2026-04-07 — Railway needs `trust proxy` for CDN
Multiple services (`brain`, `parser`, `publisher`, `dashboard`) had to add `app.set('trust proxy', true)` because Railway sits behind a CDN and Express was getting wrong client IPs. Look for "Fix: add trust proxy for Railway CDN" commits across services. **Whenever a new service is added on Railway**, add this from day one. → Worth a [knowledge node](../../knowledge/integrations/_index.md) for `integrations/railway/`.

### 2026-04-07 — External API reliability is THE main pain (MITIGATED 2026-04-09)
Image gen and other AI APIs lag or silently fail intermittently. This is currently the #1 friction point in News.AI. When something doesn't generate, the first hypothesis should be "API hiccup", not "code bug".

**Status as of 2026-04-09:** All three core services (Generator, Publisher, Brain) now have:
- **p-retry** on every external API call (OpenAI, Gemini, Cloudinary, Instagram Graph) — 3 retries with exponential backoff, `AbortError` on 4xx to avoid retrying auth/client errors
- **p-queue** concurrency control — Gemini×2, OpenAI×3, Cloudinary×3, Instagram×1 (sequential to avoid rate limits)
- **Pino structured logging** on every external call: `{ provider, latencyMs, outcome, articleId }` — searchable in Railway logs
- All `console.log/error` replaced with structured `logger.*` calls
- Scheduler trigger calls (Brain→Generator, Brain→Publisher) also retried with 60s timeout

**Remaining:** Job queue (pg-boss candidate) for full re-processability without re-running the whole pipeline.

### 2026-04-07 — gitlinks make safety checkpointing multi-step
Because each subservice is a separate git repo, a single `git commit` at the parent level only stores commit hashes (gitlinks), not the actual subservice content. Real safety checkpoint = commit inside each subservice first, THEN commit at parent. See the safety pattern in [/patterns/_index.md](../../patterns/_index.md) (to be added).

---

> Add new entries as they come up.

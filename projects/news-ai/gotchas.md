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

### 2026-04-09 — p-retry 8 / p-queue 9 require Node >= 22 (FIXED)
After adding `p-retry@8` and `p-queue@9` (ESM-only), Publisher crashed on Railway (502) because Railway uses Node 18. Upgrading Dockerfile to `node:22-alpine` didn't help — Railway may use Nixpacks ignoring the Dockerfile. **Fix:** downgraded to `p-retry@6` (Node>=16) + `p-queue@8` (Node>=18) — same API, works everywhere. Reverted Dockerfiles to `node:18-alpine`. **Rule: always check `engines.node` in ESM packages before installing.**

### 2026-04-10 — Gemini image generation requires paid API (all models)
All Gemini image gen models (`gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview`) show `limit: 0` on free tier. Google disabled free image generation. Must enable billing on Google AI Studio. Until then, Generator falls back to source image or Unsplash placeholder. Want `gemini-3-pro-image-preview` (~$0.13/image) for best quality.

### 2026-04-10 — Brain API response shape: {playbooks: [...]}, not {data: [...]}
Dashboard frontend initially mapped responses as `data.data` but Brain returns `data.playbooks`, `data.niches`, `data.articles`, `data.article`. Each endpoint has its own wrapper key. When adding new dashboard pages, always check the actual Brain response shape.

### 2026-04-10 — Dashboard env vars on Railway must include protocol
`GENERATOR_URL`, `PUBLISHER_URL`, `PARSER_URL` must be full URLs with `https://`. Without protocol, Node.js `fetch()` throws "Failed to parse URL". Example: `https://adilflow-generator-production.up.railway.app`, NOT `adilflow-generator-production.up.railway.app`.

---

> Add new entries as they come up.

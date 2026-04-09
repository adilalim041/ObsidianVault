# External API reliability — design assumption, not bug

## TL;DR

When working with **AI providers** (OpenAI, Gemini, Anthropic/Claude, Stability, Midjourney, ElevenLabs, etc.) and many other external APIs, intermittent **lag and silent failures are a structural reality**, not bugs to be tracked down case by case.

Bake reliability handling into the architecture from day one. Treat every external API call as something that **will** fail eventually.

## The wrong instinct

When a generation call doesn't return, or returns garbage, or hangs — the first instinct of someone debugging is "my code has a bug". For external AI APIs, this is **almost always wrong**. The first hypothesis should be:

> "The API hiccupped. Did we retry? Did we log enough to know which call failed and why?"

Then if logs prove it wasn't a hiccup, look at the code.

## Required architectural pieces

A News.AI / Nexus.AI-class system needs all of these for any external API integration:

### 1. Retry with backoff
- Retry transient failures (5xx, network errors, timeouts) **automatically**
- Exponential backoff: 1s, 2s, 4s, 8s, etc.
- Cap at 3-5 retries — beyond that, it's a real failure, escalate
- **Do NOT retry** on 4xx (client errors — bug, not flake)
- Use a library: `p-retry` for Node, `tenacity` for Python

### 2. Per-call structured logging
Every external API call gets logged with:
- Provider name (`openai`, `gemini`, `anthropic`, ...)
- Endpoint or operation name
- Input size (tokens, image bytes, prompt length)
- Latency (ms)
- Outcome: `success` / `retry` / `failure` (with HTTP status / error code)
- Cost (if known)

This is non-negotiable. Without it, you cannot tell whether the API is degrading, whether your retries are silently masking a real problem, or which specific call broke.

### 3. Job queue / outbox pattern for retries
For pipelines (parse → analyze → generate → publish), failures should not blow up the whole run. Each step is a job:
- Job marked `pending` → `running` → `succeeded` / `failed`
- Failed jobs can be retried independently
- Pipeline state survives a process restart
- A single failed image gen does not require re-running the entire ingest

For Node, this can be as simple as a `jobs` table in Postgres with a worker loop, or as fancy as BullMQ. For Python, similar — DB-backed queue, or Celery if scale demands it.

### 4. Timeouts on every call
- Set an explicit timeout. AI APIs can hang indefinitely.
- Different providers have different "normal" latencies:
  - Text completion: 5-30s typical, 60s timeout reasonable
  - Image gen: 10-60s typical, 120s timeout reasonable
  - Long video / batch: minutes, design a polling pattern instead
- **Never** make a synchronous user request wait on an unbounded API call

### 5. Provider abstraction
Wrap each provider behind a thin adapter so you can swap them. AI provider quality changes monthly; lock-in is expensive. Adapter should expose: `generate(prompt, options) → result`, with consistent error types.

## Per-task model selection

Adil's North Star (for News.AI generation): **use the right model for each task, not one model for everything**. This compounds with the points above — each task's adapter knows which provider it uses and why.

| Task | Model criteria |
|---|---|
| Image generation | Quality of output, cost per image |
| Headline / hook writing | Style, brevity, hook quality |
| Long-form text | Coherence, accuracy |
| Structured extraction | JSON-mode reliability, schema adherence |
| Classification (e.g. funnel stage) | Cost, latency, accuracy on short inputs |
| Embeddings | Quality, dimension, cost |

Each provider/model is good at some of these, mediocre at others. Lock the choice in code per task, not per project.

## What this enables

When you have all of the above:
- A failed image gen does not break the day's pipeline
- You can tell at a glance whether OpenAI is having a bad hour
- You can swap providers without rewriting business logic
- Debugging "why didn't this post publish?" takes minutes, not hours

## Where this came from

This is the **single biggest source of friction** in both News.AI and Nexus.AI as of 2026-04-07. In both projects, "API doesn't generate" / "lags out" / "silently fails" is the dominant pain. Treating it as a structural reality (and architecting around it) is the path out — fighting it case by case is the path that loops forever.

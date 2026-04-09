# p-retry

## What it is

A tiny Node library for retrying a function with **exponential backoff**. Wraps any async function and retries it on failure according to your strategy.

## License

**MIT.**

## Used for

- **News.AI** — wrap every external AI API call (Gemini, OpenAI, Claude). **This is the #1 fix for the "APIs lag and fail" pain.**
- **Omoikiri.AI** — wrap WhatsApp send operations, Supabase calls in cron jobs
- **Anywhere** an external API is called

## Why it matters specifically for Adil

The single biggest source of friction in News.AI and Nexus.AI is "API doesn't generate / lags / silently fails". `p-retry` is the immediate, drop-in fix for transient failures. Combined with proper logging (`pino`) and a queue (`bullmq`), it eliminates ~80% of "why didn't this work yesterday" pain.

## How to use

```bash
npm i p-retry
```

```js
import pRetry from 'p-retry'

async function generateImage(prompt) {
  const response = await fetch('https://api.gemini.com/...', {
    method: 'POST',
    body: JSON.stringify({ prompt })
  })
  if (!response.ok) {
    throw new Error(`Gemini failed: ${response.status}`)
  }
  return response.json()
}

const result = await pRetry(() => generateImage('a cat'), {
  retries: 5,
  minTimeout: 1000,         // start with 1s
  maxTimeout: 30000,        // cap at 30s
  factor: 2,                // exponential
  onFailedAttempt: (error) => {
    console.log(`Attempt ${error.attemptNumber} failed: ${error.message}`)
    console.log(`Retries left: ${error.retriesLeft}`)
  }
})
```

## What to retry vs not retry

- **Retry:** network errors, 5xx server errors, 429 rate limits (with longer backoff), timeouts
- **Do NOT retry:** 4xx client errors (400, 401, 403, 404) — these are bugs, not flakes
- **Never retry:** auth failures (401) — you'll get banned

`p-retry` lets you throw `AbortError` to bail out early on non-retryable errors:

```js
import pRetry, { AbortError } from 'p-retry'

await pRetry(async () => {
  const r = await fetch(url)
  if (r.status === 401) throw new AbortError('Bad API key, no point retrying')
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}, { retries: 5 })
```

## Score: 10/10 for Adil

Single most important backend lib for solving Adil's current main pain. Should be in `news-project` and `wa-bridge` immediately.

## Alternatives

- **`async-retry`** — older, similar
- **`got`** — full HTTP client with retry built in. Heavier but covers more.
- Built-in retry in some SDKs (OpenAI SDK, Anthropic SDK have it)

## Links

- https://github.com/sindresorhus/p-retry

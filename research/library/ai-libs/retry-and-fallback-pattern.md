# Pattern: Retry + multi-provider fallback

## What it is

A composable pattern that combines:
- **`p-retry`** for transient failure recovery (retry the same provider with backoff)
- **Multi-provider abstraction** for hard failures (when one provider is down, try another)
- **`p-queue`** for concurrency limits (don't overload any single provider)
- **Structured logging** so you can see which provider succeeded/failed
- **Job queue** so a failed batch doesn't lose work

This is the **operational backbone** of any reliable AI pipeline — it directly addresses Adil's #1 pain (APIs lag and fail).

## Recipe

```ts
import pRetry, { AbortError } from 'p-retry'
import PQueue from 'p-queue'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { anthropic } from '@ai-sdk/anthropic'
import { logger } from './logger'  // pino instance

const queue = new PQueue({ concurrency: 3 })

// Each provider attempt: retry with backoff, log every call
async function callProvider(model: any, modelName: string, prompt: string) {
  return pRetry(
    async () => {
      const start = Date.now()
      try {
        const { text } = await generateText({ model, prompt })
        logger.info({
          provider: modelName,
          latencyMs: Date.now() - start,
          outcome: 'success',
        }, 'ai call ok')
        return text
      } catch (err: any) {
        // Don't retry on auth/permission errors
        if (err.status === 401 || err.status === 403) {
          throw new AbortError(err.message)
        }
        logger.warn({
          provider: modelName,
          latencyMs: Date.now() - start,
          err: err.message,
        }, 'ai call attempt failed')
        throw err
      }
    },
    {
      retries: 3,
      minTimeout: 1000,
      factor: 2,
    }
  )
}

// Multi-provider fallback wrapper
async function generateWithFallback(prompt: string): Promise<string> {
  const providers = [
    { model: openai('gpt-4o-mini'), name: 'openai-gpt-4o-mini' },
    { model: google('gemini-2.0-flash'), name: 'gemini-2.0-flash' },
    { model: anthropic('claude-3-5-haiku-20241022'), name: 'claude-haiku' },
  ]

  for (const { model, name } of providers) {
    try {
      return await callProvider(model, name, prompt)
    } catch (err) {
      logger.error({ provider: name, err }, 'provider exhausted, trying next')
      continue
    }
  }
  throw new Error('All providers failed')
}

// Use it in queued context
const result = await queue.add(() => generateWithFallback('Write a headline'))
```

## Why this pattern wins

- **Transient failures** (network, 503, timeout) are absorbed by `p-retry`
- **Provider outages** (whole API is down for an hour) are absorbed by fallback
- **Rate limit collisions** are absorbed by `p-queue` concurrency cap
- **Auth/bug errors** fail fast (no useless retries on 401)
- **Every call is observable** in logs — you can tell which provider had a bad day
- **Cost-aware fallback order** — put cheap models first, expensive last

## When to use

For **every** AI call in production. Wrap once, use everywhere.

## Composition with `instructor` / `generateObject` for structured output

The same pattern works with structured output:

```ts
import { generateObject } from 'ai'

async function classifyWithFallback(text: string) {
  return generateWithFallback /* ... but using generateObject + Zod schema */
}
```

## Score: 10/10 for Adil

This is the **most important pattern in the entire library** for Adil's specific situation. Implement it once, refactor News.AI generator + Omoikiri analyzer to use it.

## Related cards

- [p-retry](../backend-libs/p-retry.md)
- [p-queue](../backend-libs/p-queue.md)
- [pino](../backend-libs/pino.md)
- [vercel-ai-sdk](vercel-ai-sdk.md)
- [/knowledge/integrations/external-api-reliability.md](../../../knowledge/integrations/external-api-reliability.md)

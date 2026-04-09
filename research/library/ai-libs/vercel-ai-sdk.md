# Vercel AI SDK

## What it is

A TypeScript SDK for building AI-powered features in Node and React. Multi-provider (OpenAI, Anthropic, Google, Mistral, etc.), streaming-first, includes React hooks for chat UIs.

## License

**Apache 2.0.**

## Used for

- **News.AI** — orchestrating AI calls across multiple providers in Node services. Best alternative to LiteLLM for the Node side.
- **Omoikiri.AI** — daily analyzer if it's in Node (likely is)
- **Any future React app** that needs an AI chat or completion UI

## Why it matters for Adil

LiteLLM is Python-first; the Node ecosystem needed an equivalent. Vercel AI SDK is the answer. Same idea: one API across providers, but TypeScript-native and with first-class streaming support (which matters when you build chat UIs).

## How to use

```bash
npm i ai @ai-sdk/openai @ai-sdk/google @ai-sdk/anthropic
```

```ts
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { anthropic } from '@ai-sdk/anthropic'

// Same call, different model
const { text } = await generateText({
  model: openai('gpt-4o-mini'),
  prompt: 'Write a headline about cats',
})

const { text: imagePrompt } = await generateText({
  model: google('gemini-2.0-flash'),
  prompt: 'Generate an image prompt for a cat',
})

const { text: classification } = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  prompt: 'Is this lead qualified?',
})
```

## Streaming

```ts
import { streamText } from 'ai'

const { textStream } = await streamText({
  model: openai('gpt-4o'),
  prompt: 'Tell me a story',
})

for await (const chunk of textStream) {
  process.stdout.write(chunk)
}
```

## Structured output (built in)

```ts
import { generateObject } from 'ai'
import { z } from 'zod'

const { object } = await generateObject({
  model: openai('gpt-4o-mini'),
  schema: z.object({
    funnelStage: z.enum(['new', 'qualified', 'won', 'lost']),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
  }),
  prompt: `Classify this conversation: ${conversationText}`,
})

// `object` is fully typed and validated
```

This combines Zod + AI calls into one elegant pattern.

## Score: 10/10 for Adil

For Node services (News.AI, Omoikiri), this is THE library. For Python (Nexus), use LiteLLM.

## Alternatives

- LiteLLM (Python)
- Direct provider SDKs (one at a time, not abstracted)

## Links

- https://sdk.vercel.ai

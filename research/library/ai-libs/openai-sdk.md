# OpenAI SDK (official)

## What it is

The official Node.js / TypeScript SDK from OpenAI for chat completions, embeddings, image generation (DALL-E — note: Adil rejected this for quality), audio (Whisper, TTS), assistants, and the Realtime API.

## License

**Apache 2.0.**

## Used for

- Direct OpenAI API access when not abstracting through Vercel AI SDK
- Embeddings (text-embedding-3-small / -large) for vector search
- Whisper API for transcription (Nexus voice features)
- Currently News.AI uses GPT-4-mini for prompts/headlines (placeholder)

## How to use

```bash
npm i openai
```

```ts
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Chat completion
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello' },
  ],
})

// Embeddings (for vector search)
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: 'Some text to embed',
})
// embedding.data[0].embedding is a 1536-dim vector
```

## Structured output (native, no instructor needed)

```ts
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'

const Schema = z.object({ funnelStage: z.string(), confidence: z.number() })

const result = await openai.chat.completions.parse({
  model: 'gpt-4o-mini',
  messages: [...],
  response_format: zodResponseFormat(Schema, 'analysis'),
})

const parsed = result.choices[0].message.parsed  // typed object
```

## Score: 9/10 for Adil

Use directly when you only need OpenAI. Use Vercel AI SDK if you need multi-provider.

## Links

- https://github.com/openai/openai-node
- https://platform.openai.com/docs

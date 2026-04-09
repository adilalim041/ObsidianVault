# instructor-js

## What it is

A library that forces LLMs to return **validated, structured JSON** matching a Zod schema. Uses retries internally — if the model returns invalid JSON, it sends the error back to the model and asks it to fix the output.

## License

**MIT.**

## Used for

- **Omoikiri.AI** — funnel stage classification, lead qualification, tag extraction. Anywhere AI output needs to be a clean object the rest of your code can rely on.
- **News.AI** — generating structured post metadata, extracting entities from articles, categorization

## Why it matters for Adil

Right now, AI calls in Adil's projects probably go: prompt → text response → parse JSON manually → hope it's valid → handle errors. This breaks constantly because models return prose around the JSON, or wrong field names, or missing fields.

instructor-js solves this end-to-end: define the schema with Zod, make the call, get back a typed object or a clear error. No more "did the AI return JSON this time?"

**Note:** Vercel AI SDK now has `generateObject` which does the same thing built-in (see vercel-ai-sdk card). If using Vercel AI SDK, you don't need instructor-js separately. instructor-js is the choice if you're calling OpenAI directly without an abstraction.

## How to use

```bash
npm i @instructor-ai/instructor zod openai
```

```ts
import Instructor from '@instructor-ai/instructor'
import OpenAI from 'openai'
import { z } from 'zod'

const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const client = Instructor({ client: oai, mode: 'TOOLS' })

const LeadAnalysisSchema = z.object({
  funnelStage: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']),
  isQualified: z.boolean(),
  reasoning: z.string(),
  nextAction: z.string(),
  tags: z.array(z.string()),
})

const result = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'Analyze this WhatsApp conversation and classify the lead.' },
    { role: 'user', content: conversationText },
  ],
  response_model: { schema: LeadAnalysisSchema, name: 'LeadAnalysis' },
})

// `result` is a typed LeadAnalysisSchema instance
// If the model returned invalid output, instructor retried automatically
```

## Score: 9/10 for Adil

Excellent for Omoikiri's AI analyzer. If using Vercel AI SDK, prefer `generateObject` — same idea, fewer dependencies.

## Alternatives

- **Vercel AI SDK `generateObject`** — same idea, integrated with multi-provider
- **OpenAI's structured outputs** (response_format: json_schema) — works only with OpenAI but native

## Python equivalent

Same package, different language: see [../python-libs/instructor-py.md](../python-libs/instructor-py.md)

## Links

- https://instructor-ai.github.io/instructor-js/

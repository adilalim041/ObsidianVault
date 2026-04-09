# Zod

## What it is

A TypeScript-first schema validation library. You define a schema, you get both **runtime validation** and **static TypeScript types** from the same definition.

## License

**MIT.**

## Used for

- Validating API request bodies
- Validating env vars at startup (catch missing config before crash in prod)
- Validating AI responses (especially with `instructor-js`)
- Defining shared types between frontend and backend
- Anywhere untrusted data enters the system

## Why it matters for Adil

Right now, AI responses, webhook payloads, and Supabase rows are all "trust me, it's the shape I expect". When the shape changes (new Gemini API version, modified webhook format, schema migration) — silent breakage. Zod makes it loud and immediate.

Example: when Gemini returns an image generation result, validate the shape. If Gemini changes its API, you get a clear validation error instead of "undefined is not a function" three layers deep.

## How to use

```bash
npm i zod
```

```ts
import { z } from 'zod'

// Define schema
const ContactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string(),
  email: z.string().email().optional(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
})

// Get TypeScript type for free
type Contact = z.infer<typeof ContactSchema>

// Validate at runtime
const parsed = ContactSchema.parse(unknownData)  // throws if invalid
const safe = ContactSchema.safeParse(unknownData)  // returns { success, data | error }
```

## Validate env vars (highly recommended pattern)

```ts
// config.ts
import { z } from 'zod'

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  PORT: z.coerce.number().default(3000),
})

export const env = envSchema.parse(process.env)
// Now `env.PORT` is typed as number, all values are guaranteed present
// If any env var is missing, the app fails on startup with a clear error
```

## Score: 10/10 for Adil

Should be in every Node project. The "validate env vars at boot" pattern alone saves hours of mysterious production crashes.

## Alternatives

- **Yup** — older, similar
- **Valibot** — newer, smaller bundle, similar API
- **Joi** — non-TS-first, classic Hapi.js choice

## Links

- https://zod.dev

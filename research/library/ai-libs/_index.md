# Library: AI libs

> SDKs and abstractions for working with AI providers across Adil's projects.

## Multi-provider abstraction

- [litellm.md](litellm.md) — One API across OpenAI, Anthropic, Gemini, Cohere, etc. **Critical for News.AI per-task LLM specialization.**
- [vercel-ai-sdk.md](vercel-ai-sdk.md) — Vercel's AI SDK. Streaming-first, multi-provider.

## Structured output

- [instructor-js.md](instructor-js.md) — Force LLMs to return validated JSON matching a schema (uses Zod). Use whenever you need structured data from AI.

## Direct provider SDKs

- [openai-sdk.md](openai-sdk.md) — Official OpenAI Node SDK
- [anthropic-sdk.md](anthropic-sdk.md) — Official Anthropic SDK (Claude)
- [google-genai.md](google-genai.md) — Official Gemini SDK (already used in News.AI)

## Patterns

- [retry-and-fallback-pattern.md](retry-and-fallback-pattern.md) — Recipe: retry one provider, fall back to another on failure. Combines p-retry + multiple SDKs.

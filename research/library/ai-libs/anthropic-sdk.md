# Anthropic SDK (official)

## What it is

The official Node.js / TypeScript SDK from Anthropic for Claude models. Supports messages API, tool use, vision, prompt caching, and streaming.

## License

**MIT.**

## Used for

- **Omoikiri.AI** — daily AI conversation analyzer (currently using Claude API — confirm in code)
- Any task where Claude's strengths matter: long context, careful reasoning, instruction following

## How to use

```bash
npm i @anthropic-ai/sdk
```

```ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  system: 'You analyze WhatsApp conversations and assign sales funnel stages.',
  messages: [
    { role: 'user', content: conversationText },
  ],
})

console.log(message.content[0].text)
```

## Tool use (function calling)

```ts
const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  tools: [{
    name: 'set_funnel_stage',
    description: 'Set the funnel stage for a contact',
    input_schema: {
      type: 'object',
      properties: {
        stage: { type: 'string', enum: ['new', 'qualified', 'won', 'lost'] },
        reason: { type: 'string' },
      },
      required: ['stage', 'reason'],
    },
  }],
  messages: [{ role: 'user', content: conversationText }],
})

// Check message.stop_reason for 'tool_use'
```

## Prompt caching (huge cost saver for repeated context)

If your daily analyzer sends the same system prompt + same instructions + only changes the conversation text, use prompt caching:

```ts
const message = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  system: [
    {
      type: 'text',
      text: longSystemPromptWithRules,
      cache_control: { type: 'ephemeral' },
    },
  ],
  messages: [{ role: 'user', content: conversationText }],
})
```

Cached portions cost ~10% of normal input tokens. If running 100 analyses/day with the same system prompt, this saves significantly.

## Score: 9/10 for Adil

Already in use somewhere. Worth checking if prompt caching is enabled in the Omoikiri analyzer — easy cost win.

## Links

- https://github.com/anthropics/anthropic-sdk-typescript
- https://docs.anthropic.com

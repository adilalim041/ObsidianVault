# LLM Gateway

**URL:** https://github.com/NullRabbitLabs/llm-gateway
**License:** unknown
**Score:** 8.2/10
**For project:** News.AI
**Found by:** vault-research-agent, niche: ai-reliability
**Date:** 2026-04-09

## What it does

A smart routing service that sits between your AI-powered app and multiple AI providers (OpenAI, Claude, Gemini, DeepSeek). When you ask for AI content, it automatically tries the cheapest provider first, then falls back to more expensive ones if there's an error. It tracks costs and response times for every request.

## Why it matters for Adil

News.AI currently relies on Gemini API directly, creating a single point of failure. When Gemini goes down or hits rate limits, content generation stops completely. This gateway solves that by automatically switching between providers—if Gemini fails, it tries OpenAI or Claude instantly. The cost tracking also helps optimize News.AI's AI spending by preferring cheaper models like DeepSeek when they work well.

## How to start using it

Deploy as a separate service on Railway alongside News.AI:

```bash
git clone https://github.com/NullRabbitLabs/llm-gateway
cd llm-gateway
```

Set up environment variables in Railway:
- `DEEPSEEK_API_KEY=<API_KEY>`
- `GEMINI_API_KEY=<API_KEY>` 
- `OPENAI_API_KEY=<API_KEY>`
- `ANTHROPIC_API_KEY=<API_KEY>`

Then replace News.AI's direct Gemini calls with requests to the gateway's `/api/v1.0/chat` endpoint. Claude Code can handle this integration by updating your content generation pipeline to call the gateway URL instead of Gemini directly.

## What it replaces or improves

Instead of News.AI making direct API calls to Gemini (risking downtime and vendor lock-in), this creates a reliability layer. It's like having multiple internet providers—if one goes down, you automatically switch to another. The cost tracking also replaces manual estimation of AI spending with precise per-request accounting.

## Risks and gotchas

The biggest red flag is the missing license information, which creates legal uncertainty for commercial use in News.AI. The codebase also has deprecated endpoints, suggesting possible API instability. You'll need API keys for multiple providers, increasing complexity and monthly costs. The Python backend adds another service to maintain alongside your Node.js stack.

## Alternatives

**LiteLLM** - More mature Python library with similar multi-provider support, better documentation, and clear Apache 2.0 license. **OpenRouter** - Hosted service that provides the same multi-provider routing without self-hosting, but with per-request fees and less control over fallback logic.
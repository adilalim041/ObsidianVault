# LiteLLM

## What it is

A unified gateway for **100+ LLM providers** — OpenAI, Anthropic, Gemini, Cohere, Mistral, local Ollama, Azure OpenAI, AWS Bedrock, and many more — all behind one consistent API. Available as a Python library AND as a proxy server.

## License

**MIT.**

## Used for

- **News.AI** — **THE solution for "per-task LLM specialization" goal.** Same code, different model per task.
- **Nexus.AI** — same benefit, single client for all providers
- **Omoikiri.AI** — daily AI analyzer, easier to swap models for cost/quality testing

## Why it matters specifically for Adil

Adil's stated North Star for News.AI is: "use the best LLM for each task, not one model for everything." Without an abstraction layer, this means importing 5 different SDKs, each with different parameter names, error formats, and streaming patterns. With LiteLLM, every model is `completion(model="gemini-pro", ...)` or `completion(model="gpt-4o", ...)` — same call, just change the model name.

This unblocks the per-task specialization vision practically.

## How to use (Python)

```bash
pip install litellm
```

```python
from litellm import completion

# Use any model with the same call
response = completion(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Write a headline about cats"}]
)

response = completion(
    model="gemini/gemini-2.0-flash",
    messages=[{"role": "user", "content": "Generate an image prompt for a cat"}]
)

response = completion(
    model="anthropic/claude-3-5-sonnet-20241022",
    messages=[{"role": "user", "content": "Classify this lead"}]
)

# Identical interface, different providers
```

## Use as a proxy (most powerful mode)

You can run LiteLLM as a proxy server. Your apps talk to the proxy as if it were OpenAI, and the proxy routes to whichever provider you configured. Add caching, rate limiting, fallbacks, retries — all in the proxy. Centralized billing, centralized logging.

```bash
litellm --model gpt-4o-mini --port 4000
# Then use http://localhost:4000 as base URL with the OpenAI client
```

## Node equivalent

LiteLLM is Python-first. For Node, the closest equivalents are:
- **Vercel AI SDK** — multi-provider, streaming-first
- **OpenRouter** — paid API gateway, similar concept

## Score: 10/10 for Adil (Python parts), 8/10 (Node parts where Vercel AI SDK is the choice)

For Nexus.AI: use LiteLLM directly. For News.AI subservices that are Node: consider Vercel AI SDK instead, or run LiteLLM as a proxy and have Node services talk to it.

## Risks

- Adds an abstraction layer; provider-specific features may be hidden
- The proxy mode adds infrastructure to maintain
- Provider name format must match LiteLLM's conventions exactly

## Links

- https://litellm.ai
- https://docs.litellm.ai

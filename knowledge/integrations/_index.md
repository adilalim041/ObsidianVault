# Knowledge: Integrations — Index

> External APIs and platforms. Documentation pointers, gotchas, rate limits, auth patterns.

## Subareas

- `railway/` — deploy, env vars, volumes, CDN, gotchas
- `vercel/` — deploy, env vars, edge functions
- `telegram/` — bot API, webhooks, rate limits
- `meta-graph/` — Facebook/Instagram/WhatsApp Business APIs
- `openai/` — chat, embeddings, function calling, rate limits
- `cloudinary/` — uploads, transformations
- `supabase/` — see backend/supabase/ instead (treated as backend, not integration)

## Nodes

- [external-api-reliability.md](external-api-reliability.md) — AI/external APIs lag and fail intermittently. Design assumption, not bug. Required architecture: retry+backoff, structured logging, job queue, timeouts, provider abstraction.
- [railway/trust-proxy.md](railway/trust-proxy.md) — Express on Railway needs `app.set('trust proxy', true)` for correct client IPs.

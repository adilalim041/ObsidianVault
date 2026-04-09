# Library: Backend libs

> Production-grade Node.js libraries for the recurring problems Adil's backends actually face: reliability, queues, logging, validation, DB access.

## Reliability

- [p-retry.md](p-retry.md) — Retry with exponential backoff. **Solves the #1 News.AI pain (flaky external APIs).**
- [p-queue.md](p-queue.md) — Concurrency control. Limit how many parallel requests you fire at one provider.

## Job queues (background work)

- [bullmq.md](bullmq.md) — The de facto Node job queue, Redis-backed.
- [graphile-worker.md](graphile-worker.md) — Postgres-backed queue (no Redis dependency, simpler infra).

## Logging / observability

- [pino.md](pino.md) — Fast structured logger, used in production by many teams.

## Validation

- [zod.md](zod.md) — Runtime validation + TypeScript types from one schema. Use everywhere you receive untrusted input (API requests, env vars, AI responses).

## Database

- [drizzle.md](drizzle.md) — Modern TypeScript ORM, lighter than Prisma, works with Postgres/Supabase.
- [supabase-js.md](supabase-js.md) — Already in use across Adil's projects. Reference patterns.

## Image processing

- [sharp.md](sharp.md) — High-performance image processing, used in News.AI template engine.

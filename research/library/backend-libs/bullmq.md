# BullMQ

## What it is

A robust, Redis-backed job queue for Node. The de facto standard for background work in the Node ecosystem. Supports delayed jobs, repeatable jobs (cron), priorities, retries, rate limiting, parent-child job dependencies.

## License

**MIT.**

## Used for

- **News.AI** — pipeline jobs: parse → analyze → generate → publish, each as a separate queue. If one job fails, only that job retries. The whole pipeline doesn't restart.
- **Omoikiri.AI** — daily AI analyzer cron, scheduled message sends, batch operations
- **Nexus.AI** — n/a (Python project, see Python equivalents)

## Why it matters for Adil

Right now, News.AI's pipelines are likely synchronous chains: brain calls parser, parser fetches stuff, returns to brain, brain calls generator, etc. If anything in the middle fails, the whole chain blows up. BullMQ converts this into: each step is a job, job state lives in Redis, failed jobs retry independently, the pipeline survives partial failures.

This is the missing infrastructure piece for "external APIs lag and fail" problem at scale.

## How to use

```bash
npm i bullmq
# Plus you need Redis. Railway has Redis as a one-click add-on.
```

```js
// producer (in brain)
import { Queue } from 'bullmq'

const imageQueue = new Queue('image-generation', {
  connection: { host: 'redis-host', port: 6379 }
})

await imageQueue.add('generate', { prompt: 'cat', source: 'article-123' }, {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 }
})
```

```js
// worker (in generator service)
import { Worker } from 'bullmq'

const worker = new Worker('image-generation', async (job) => {
  const { prompt } = job.data
  return await generateImage(prompt)  // throws on failure → automatic retry
}, {
  connection: { host: 'redis-host', port: 6379 },
  concurrency: 5,
})

worker.on('completed', (job) => console.log(`Job ${job.id} done`))
worker.on('failed', (job, err) => console.log(`Job ${job?.id} failed: ${err.message}`))
```

## Score: 9/10 for Adil

Worth introducing into News.AI when ready. Has a learning curve and adds Redis as infra dependency. Start with `p-retry` first; introduce BullMQ when reliability + parallelism become bottlenecks.

## Alternatives

- **graphile-worker** — Postgres-backed, no Redis required (lighter infra). See its own card.
- **Bree** — pure Node, no external dependency, but less robust
- **Celery** — Python equivalent (different ecosystem)

## Risks

- Adds **Redis** as a required service. On Railway, this is one click but it's another moving part.
- Operational complexity: dead-letter queues, stalled jobs, monitoring all need attention
- Probably overkill until News.AI publishes >100 posts/day

## Links

- https://docs.bullmq.io

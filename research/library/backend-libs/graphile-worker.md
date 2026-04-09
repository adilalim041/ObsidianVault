# graphile-worker

## What it is

A Node job queue that uses **Postgres** instead of Redis as its backend. Same job-queue features as BullMQ (retries, scheduled jobs, recurring jobs) but no extra infra required.

## License

**MIT.**

## Used for

When you want a real job queue but don't want to add Redis. Since Adil already has Postgres (via Supabase) in every project, this is significantly simpler infra than BullMQ.

## Why it matters for Adil

**This is probably the right choice over BullMQ for Adil specifically** because:
- Already using Supabase Postgres → no new infra
- One less thing to monitor
- One less thing to pay for on Railway
- Simpler mental model

The trade-off is BullMQ has a bigger ecosystem, more features, more battle-tested. For Adil's scale, graphile-worker is enough.

## How to use

```bash
npm i graphile-worker
```

```js
import { run } from 'graphile-worker'

await run({
  connectionString: process.env.DATABASE_URL,
  concurrency: 5,
  taskList: {
    'generate-image': async (payload, helpers) => {
      const { prompt } = payload
      const result = await generateImage(prompt)
      return result
    },
    'publish-post': async (payload, helpers) => {
      // ...
    }
  }
})

// In your producer code:
await helpers.addJob('generate-image', { prompt: 'cat' }, { maxAttempts: 5 })
```

## Score: 9/10 for Adil

Probably the better choice over BullMQ given Adil's existing Postgres setup. Try this first.

## Risks

- Smaller community than BullMQ (still actively maintained)
- Locks you into Postgres (you already are, so no problem)

## Links

- https://worker.graphile.org

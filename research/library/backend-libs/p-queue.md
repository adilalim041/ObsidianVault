# p-queue

## What it is

A promise queue with concurrency control. Limits how many async operations can run in parallel. From the same author as `p-retry`.

## License

**MIT.**

## Used for

When you need to call an API many times but the provider has rate limits, `p-queue` ensures you never exceed N concurrent requests. Combined with `p-retry` you get a robust pattern: retry failed calls, but never overload the provider.

## Why it matters for Adil

- **News.AI generator** — generating 50 images for a content batch? Don't fire all 50 at Gemini at once. Queue them with concurrency 3-5.
- **News.AI parser** — fetching 100 RSS feeds? Limit concurrency to avoid being IP-banned.
- **Omoikiri AI analyzer** — processing 100 conversations through Claude API? Limit concurrency to stay within rate limits.

## How to use

```bash
npm i p-queue
```

```js
import PQueue from 'p-queue'

const queue = new PQueue({ concurrency: 3 })

const prompts = ['cat', 'dog', 'bird', 'fish', 'horse', /* ... 50 more */]

const results = await Promise.all(
  prompts.map(prompt => queue.add(() => generateImage(prompt)))
)
```

## Combine with p-retry

```js
const queue = new PQueue({ concurrency: 3 })

const result = await queue.add(() =>
  pRetry(() => generateImage(prompt), { retries: 5 })
)
```

## Score: 9/10 for Adil

The natural companion to p-retry. Together they're the foundation of any reliable AI pipeline.

## Links

- https://github.com/sindresorhus/p-queue

# Pino

## What it is

The fastest structured logger for Node. Outputs JSON logs by default, designed for production.

## License

**MIT.**

## Used for

- **All Adil's Node services** (wa-bridge, all 6 News.AI subservices)
- Replacing `console.log` with structured logging

## Why it matters for Adil

`console.log` is fine for "did this code run", but it's useless for production debugging because:
1. You can't filter by level, service, request, anything
2. You can't search for "all logs from request X"
3. Logs from many services pile up unsearchable

Pino outputs JSON, every log line has `level`, `time`, `msg`, and any custom fields you add. Railway / any log aggregator can parse this and you can actually search.

**Critical for "external API reliability" pattern** — every API call should log: provider, latency, outcome, retry count. Pino is what makes this practical.

## How to use

```bash
npm i pino pino-pretty
```

```js
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // pretty-print in dev
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
})

logger.info('server started', { port: 3000 })
logger.error({ err: error, provider: 'gemini' }, 'image generation failed')

// Per-request child logger
const reqLogger = logger.child({ requestId: '123' })
reqLogger.info('processing request')
```

## Per-API-call logging pattern (recommended)

```js
async function callAI(provider, fn, context) {
  const start = Date.now()
  try {
    const result = await fn()
    logger.info({
      provider,
      latencyMs: Date.now() - start,
      outcome: 'success',
      ...context,
    }, 'ai call ok')
    return result
  } catch (err) {
    logger.error({
      provider,
      latencyMs: Date.now() - start,
      outcome: 'failure',
      err: err.message,
      ...context,
    }, 'ai call failed')
    throw err
  }
}
```

## Score: 10/10 for Adil

Essential infrastructure. Add to every Node service in News.AI immediately.

## Alternatives

- **Winston** — older, slower, more flexible config
- **Bunyan** — older, similar to Pino
- **console.log** — unacceptable for production

## Links

- https://getpino.io

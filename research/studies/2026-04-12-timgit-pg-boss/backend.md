# pg-boss — Backend Deep Dive

**Repo:** timgit/pg-boss
**Analyzed:** 2026-04-12
**Version analyzed:** schema v26 (release 11.x)
**Purpose:** Job queue on top of PostgreSQL — no Redis, no extra infra. One Postgres connection handles job storage, scheduling, retry, DLQ, and observability.

---

## Architecture overview

Five internal classes with clear responsibilities:

| Class | File | Role |
|---|---|---|
| `PgBoss` | `index.ts` | Public facade. Delegates everything. Owns lifecycle (start/stop). |
| `Manager` | `manager.ts` | Workers, send/fetch/complete/fail, group concurrency tracking. |
| `Timekeeper` | `timekeeper.ts` | Cron scheduling, clock skew detection, `__pgboss__send-it` internal queue. |
| `Boss` | `boss.ts` | Supervision loop: timeout detection, heartbeat failure, maintenance, backlog warnings. |
| `Contractor` | `contractor.ts` | Schema install and migrations. |
| `Bam` | `bam.ts` | Async migration executor — runs DDL commands from the `bam` table in background. |

Events bubble up via `#promoteEvents()` — each inner class emits to PgBoss which re-emits to callers. Four events: `error`, `warning`, `wip`, `stopped`, `bam`.

---

## Pattern 1: Job lifecycle — INSERT→active→complete/fail/retry (WITH CTE chain)

The most important SQL in the codebase is `fetchNextJob()` in `plans.ts`. It atomically claims a job using `FOR UPDATE SKIP LOCKED`:

```sql
WITH
  next AS (
    SELECT id
    FROM pgboss.job_common
    WHERE name = 'content-generate'
      AND state < 'active'
      AND start_after < now()
    ORDER BY priority DESC, created_on, id
    LIMIT 5
    FOR UPDATE SKIP LOCKED
  )
UPDATE pgboss.job_common j SET
  state = 'active',
  started_on = now(),
  heartbeat_on = now(),
  retry_count = CASE WHEN started_on IS NOT NULL THEN retry_count + 1 ELSE retry_count END
FROM next
WHERE j.name = 'content-generate' AND j.id = next.id
RETURNING j.id, j.name, j.data, j.expire_seconds as "expireInSeconds",
          j.heartbeat_seconds as "heartbeatSeconds", j.group_id as "groupId"
```

Key insight: `FOR UPDATE SKIP LOCKED` is the entire concurrency mechanism. No Redis, no Lua scripts. Multiple workers on multiple nodes can poll the same queue — each gets a different row.

The `state` column is a PostgreSQL ENUM ordered numerically:
```
created < retry < active < completed < cancelled < failed
```
This allows range comparisons like `state < 'active'` (queued) and `state > 'active'` (done).

**News.AI application:** Content pipeline steps (parse → classify → generate → publish) map to separate queues. Brain sends to `content-classify`, classifier worker fetches, completes, sends to `content-generate`.

---

## Pattern 2: Retry with exponential backoff — pure SQL, no application code

When a job fails, `failJobs()` in `plans.ts` runs a 3-CTE transaction. The retry/fail decision and new `start_after` are computed entirely in SQL:

```sql
WITH deleted_jobs AS (
  DELETE FROM pgboss.job_common
  WHERE name = $1 AND id = ANY($2::uuid[]) AND state < 'completed'
  RETURNING *
),
retried_jobs AS (
  INSERT INTO pgboss.job_common (id, name, data, state, retry_count, start_after, ...)
  SELECT
    id,
    name,
    data,
    CASE
      WHEN retry_count < retry_limit THEN 'retry'::pgboss.job_state
      ELSE 'failed'::pgboss.job_state
    END as state,
    retry_count,
    CASE
      WHEN NOT retry_backoff THEN now() + retry_delay * interval '1s'
      ELSE now() + LEAST(
        retry_delay_max,
        retry_delay * (
          2 ^ LEAST(16, retry_count + 1) / 2 +
          2 ^ LEAST(16, retry_count + 1) / 2 * random()
        )
      ) * interval '1s'
    END as start_after
  FROM deleted_jobs
  ON CONFLICT DO NOTHING
  RETURNING *
),
failed_jobs AS (
  -- jobs that exceeded retry_limit land here
  INSERT INTO pgboss.job_common (..., state = 'failed') ...
  FROM deleted_jobs WHERE id NOT IN (SELECT id FROM retried_jobs)
  RETURNING *
),
dlq_jobs AS (
  -- if queue has dead_letter configured, copy failed job payload there
  INSERT INTO pgboss.job (name, data, ...)
  SELECT r.dead_letter, data, ...
  FROM (SELECT * FROM retried_jobs UNION ALL SELECT * FROM failed_jobs) r
  JOIN pgboss.queue q ON q.name = r.dead_letter
  WHERE state = 'failed'
)
SELECT COUNT(*) FROM retried_jobs UNION ALL SELECT * FROM failed_jobs
```

Backoff formula: `retryDelay * (2^min(16,retryCount) / 2 + 2^min(16,retryCount) / 2 * random())`. The `random()` is jitter — prevents retry storms when multiple jobs fail simultaneously.

**Queue defaults** (from `plans.ts`):
- `retryLimit: 2`
- `retryDelay: 0` (immediate)
- `retryBackoff: false`
- `expireInSeconds: 900` (15 min active timeout)
- `retentionSeconds: 1209600` (14 days queued)
- `deleteAfterSeconds: 604800` (7 days after completion)

**News.AI application:** Override at queue level for external API calls:
```js
await boss.createQueue('instagram-publish', {
  retryLimit: 5,
  retryBackoff: true,
  retryDelay: 30,        // 30s base, exponential with jitter
  retryDelayMax: 3600,   // cap at 1 hour
  deadLetter: 'instagram-failed'
})
```

---

## Pattern 3: Dead Letter Queue — automatic, config-driven

DLQ is a first-class feature. When a queue has `deadLetter` set, any job that exhausts its retry limit is automatically copied to the DLQ queue (see the `dlq_jobs` CTE in Pattern 2).

```js
// Setup
await boss.createQueue('content-generate', {
  deadLetter: 'content-generate-dlq',
  retryLimit: 3,
  retryBackoff: true
})

await boss.createQueue('content-generate-dlq', {
  retentionSeconds: 60 * 60 * 24 * 30  // keep DLQ jobs 30 days
})

// Monitor DLQ
await boss.work('content-generate-dlq', async (jobs) => {
  for (const job of jobs) {
    await notifySlack(`Job failed after all retries: ${JSON.stringify(job.data)}`)
    // or push to manual review queue
  }
})

// Replay a specific job from DLQ
const [dlqJob] = await boss.fetch('content-generate-dlq', { batchSize: 1 })
await boss.send('content-generate', dlqJob.data)
await boss.deleteJob('content-generate-dlq', dlqJob.id)
```

**Omoikiri application:** WhatsApp outgoing messages that fail after all retries (network issue, ban, etc.) can land in `wa-send-dlq` — Telegram alert fires, manager can review and resend.

---

## Pattern 4: Cron scheduling — clock skew-safe, stored in DB

Scheduling lives in `Timekeeper`. Cron expressions are stored in `pgboss.schedule` table (survives restarts). On each `onCron()` cycle, Timekeeper checks all schedules with `shouldSendIt()`:

```typescript
shouldSendIt(cron: string, tz: string): boolean {
  const interval = CronExpressionParser.parse(cron, { tz, strict: false })
  const prevTime = interval.prev()
  const databaseTime = Date.now() + this.clockSkew  // <-- compensates for server/db drift
  const prevDiff = (databaseTime - prevTime.getTime()) / 1000
  return prevDiff < 60  // fire if last trigger was within the past minute
}
```

Jobs are inserted into an internal `__pgboss__send-it` queue with `singletonKey` + `singletonSeconds: 60` — this prevents duplicate fires even if multiple nodes check simultaneously.

```js
// Schedule RSS parsing every 15 minutes
await boss.createQueue('parse-rss')
await boss.schedule('parse-rss', '*/15 * * * *', { nicheName: 'ai_news' }, { tz: 'UTC' })

// Multiple schedules for the same queue (key differentiates them)
await boss.schedule('parse-rss', '0 9 * * *', { nicheName: 'health_medicine' }, {
  tz: 'Asia/Almaty',
  key: 'health-morning'
})

// Scheduled publishing at exact time (sendAfter alternative)
await boss.schedule(
  'publish-post',
  '0 18 * * *',   // 6pm daily
  { channelId: 'instagram-main' },
  { tz: 'Asia/Almaty' }
)
```

**Clock skew detection:** Timekeeper polls `SELECT round(date_part('epoch', now()) * 1000)` every 10 minutes and compares to `Date.now()`. If skew > 60s, emits a `warning` event and persists to `pgboss.warning` table.

**News.AI application:** Replace the in-Brain `setInterval`-based scheduler with pg-boss `schedule()`. The schedule survives service restarts. If Brain crashes and restarts, it will catch up on any missed cron fires (the `prevDiff < 60` check handles this on next supervisor cycle).

---

## Pattern 5: Throttle vs Debounce — singleton slots

Both implemented in `Manager` via `singletonSeconds` and `singletonOn` SQL column.

`singletonOn` stores a floored timestamp: `'epoch'::timestamp + '1s'::interval * floor(epoch / singletonSeconds)`. This creates time "buckets". The `job_i4` unique index on `(name, singleton_on, COALESCE(singleton_key, ''))` prevents two jobs from occupying the same bucket.

**Throttle** — `sendThrottled()`: `singletonNextSlot = false`. If a job already exists in the current time bucket, the new one is silently dropped (returns `null`).

**Debounce** — `sendDebounced()`: `singletonNextSlot = true`. Two-attempt logic in `createJob()`:
1. Try current bucket → likely conflict (returns `null` if job exists).
2. If conflict, compute next bucket start time: `getDebounceStartAfter()`, set `singletonOffset = singletonSeconds`, retry insert. The new job is scheduled for the _next_ bucket with `startAfter` pointing to when that bucket opens.

```js
// Throttle: at most one classification job per 30 seconds per article
await boss.sendThrottled(
  'classify-article',
  { articleId: '123', url: 'https://...' },
  null,
  30,          // throttle window: 30 seconds
  'article-123' // singletonKey — per-article throttle
)

// Debounce: if user edits a post multiple times rapidly, only publish once
// after the last edit, delayed by 5 minutes
await boss.sendDebounced(
  'publish-post',
  { postId: '456', channelId: 'instagram-main' },
  null,
  300,       // 5-minute debounce window
  'post-456'
)
```

**Omoikiri application:** Debounce AI analysis per dialog session — if multiple messages arrive in quick succession, only trigger analysis once after the last message.

---

## Pattern 6: Queue policies — 6 concurrency behaviors enforced by unique indexes in SQL

All policies enforced by partial unique indexes on `pgboss.job`, no application logic:

| Policy | Index | Behavior |
|---|---|---|
| `standard` | none | Normal queue, all features |
| `short` | `job_i1`: UNIQUE on `(name, COALESCE(singletonKey,''))` WHERE `state='created'` | Max 1 queued job (per key). New jobs silently dropped if one exists. |
| `singleton` | `job_i2`: UNIQUE on `(name, COALESCE(singletonKey,''))` WHERE `state='active'` | Max 1 active job (per key). Multiple can queue. |
| `stately` | `job_i3`: UNIQUE on `(name, state, COALESCE(singletonKey,''))` WHERE `state <= 'active'` | Max 1 per state (1 queued + 1 active). |
| `exclusive` | `job_i6`: UNIQUE on `(name, COALESCE(singletonKey,''))` WHERE `state <= 'active'` | Max 1 total (queued OR active). |
| `key_strict_fifo` | `job_i8`: UNIQUE on `(name, singletonKey)` WHERE `state IN ('active','retry','failed')` | Strict per-key ordering. Blocks new jobs with same key while any is active/retry/failed. |

```js
// Singleton: only one AI analysis running per session at a time
await boss.createQueue('ai-analysis', { policy: 'singleton' })

// Send with singletonKey for per-session singleton behavior
await boss.send('ai-analysis', { sessionId: 'abc' }, {
  singletonKey: 'session-abc'
})

// Exclusive: only one RSS parse cycle running globally
await boss.createQueue('parse-rss-cycle', { policy: 'exclusive' })

// key_strict_fifo: WhatsApp messages to same contact must be sent in order
await boss.createQueue('wa-send', { policy: 'key_strict_fifo' })
await boss.send('wa-send', { to: '+77001234567', text: 'Hello' }, {
  singletonKey: '+77001234567'  // required for key_strict_fifo
})
```

**Omoikiri application:** `key_strict_fifo` per contact JID guarantees WhatsApp messages are sent in order — critical because out-of-order sends break conversation flow.

---

## Pattern 7: Group concurrency — tiered rate limiting across distributed workers

A job can have `group: { id: string, tier?: string }`. Workers can limit concurrent active jobs per group:

```typescript
// Local (in-memory, no DB overhead, single node)
await boss.work('content-generate', {
  localConcurrency: 10,
  localGroupConcurrency: { default: 2, tiers: { premium: 5 } }
}, async (jobs) => { ... })

// Global (DB-tracked, works across multiple nodes)
await boss.work('content-generate', {
  batchSize: 5,
  groupConcurrency: { default: 2, tiers: { premium: 5 } }
}, async (jobs) => { ... })
```

Global concurrency uses a CTE that counts active jobs per group, then filters candidates:

```sql
WITH
  active_group_counts AS (
    SELECT group_id, COUNT(*)::int as active_cnt
    FROM pgboss.job_common
    WHERE name = 'content-generate' AND state = 'active' AND group_id IS NOT NULL
    GROUP BY group_id
  ),
  group_ranking AS (
    SELECT id, group_id, group_tier,
      ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY id) as group_rn,
      COALESCE(agc.active_cnt, 0) as active_cnt
    FROM next
    LEFT JOIN active_group_counts agc ON agc.group_id = next.group_id
  ),
  group_filtered AS (
    SELECT id FROM group_ranking
    WHERE group_id IS NULL
      OR (active_cnt + group_rn) <= COALESCE(($tiers ->> group_tier)::int, $defaultLimit)
  )
UPDATE ... FROM group_filtered ...
```

**News.AI application:** Group by `nicheName` to limit concurrent generation per niche (avoid overwhelming Gemini per niche bucket). Tier by niche priority.

---

## Pattern 8: Heartbeat — long-running job liveness detection

For jobs that run longer than `expireInSeconds`, use heartbeats:

```js
await boss.createQueue('video-process', {
  heartbeatSeconds: 60,    // worker must touch every 60s
  expireInSeconds: 3600    // fallback if heartbeat not configured
})

await boss.work('video-process', {
  heartbeatRefreshSeconds: 25  // touch every 25s (half of 60s)
}, async (jobs) => {
  // pg-boss automatically calls boss.touch() via setInterval inside #processJobs()
  // The AbortSignal on job.signal fires if the job is killed by supervisor
  for (const job of jobs) {
    job.signal.addEventListener('abort', () => {
      // cleanup resources on forced abort during shutdown
    })
    await processVideo(job.data.videoUrl)
  }
})
```

`Boss.#monitor()` runs on `superviseIntervalSeconds` (default 60s). It calls `failJobsByHeartbeat()` — any active job with `heartbeat_on + heartbeat_seconds < now()` is failed and retried.

**Omoikiri application:** Long-running dialog analysis (Claude API call that could take 30s+) should set `heartbeatSeconds: 30` so the supervisor can detect and retry if the Railway process was OOM-killed mid-call.

---

## Pattern 9: Connection sharing — bring your own DB client

pg-boss accepts an external `db` object implementing one method: `executeSql(text, values)`. This lets it share the same connection pool as the rest of the app:

```typescript
// With pg pool
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const boss = new PgBoss({
  db: {
    executeSql: (text, values) => pool.query(text, values)
  }
})

// With Drizzle (access the underlying pg client)
import { drizzle } from 'drizzle-orm/node-postgres'
const db = drizzle(pool)

const boss = new PgBoss({
  db: {
    executeSql: (text, values) => pool.query(text, values)
  }
})

// Transaction-scoped jobs (atomically enqueue with business logic)
await pool.query('BEGIN')
await pool.query('INSERT INTO articles (...) VALUES (...)')
await boss.send('process-article', { articleId: 'xyz' }, {
  db: {
    executeSql: (text, values) => pool.query(text, values)  // same transaction!
  }
})
await pool.query('COMMIT')
// If COMMIT fails, job is never enqueued. Transactional outbox pattern.
```

This is the **transactional outbox pattern** built in. Job enqueue is atomic with the business operation.

**News.AI application:** When Brain saves an article to Supabase, it can enqueue the `classify-article` job in the same transaction. If the DB write fails, no orphaned job exists.

---

## Pattern 10: Migrations — race-condition safe, pg advisory locks

Every DDL operation is wrapped in `locked()`:

```typescript
function locked(schema: string, query: string | string[], key?: string): string {
  return `
    BEGIN;
    SET LOCAL lock_timeout = 30000;
    SET LOCAL idle_in_transaction_session_timeout = 30000;
    SELECT pg_advisory_xact_lock(
      ('x' || encode(sha224(
        (current_database() || '.pgboss.${schema}${key || ''}')::bytea
      ), 'hex'))::bit(64)::bigint
    );
    ${Array.isArray(query) ? query.join(';\n') : query};
    COMMIT;
  `
}
```

Migration race condition handled by `assertMigration()`:
```sql
-- Raises 'division by zero' if already at target version
SELECT version::int / (version::int - 26) FROM pgboss.version
```

In `Contractor.migrate()`:
```typescript
try {
  await this.db.executeSql(commands)
} catch (err: any) {
  // If another node already ran the migration, ignore
  assert(err.message.includes('division by zero'), err)
}
```

Same pattern for schema creation:
```typescript
} catch (err: any) {
  assert(err.message.includes('already exists'), err)
}
```

Multiple app nodes can start simultaneously — only one will run the migration, others will hit the advisory lock timeout or catch the expected error.

**Async migrations (BAM):** Heavy operations (index creation on large tables) go into `pgboss.bam` table as pending commands. `Bam` class executes them sequentially in background, emitting `bam` events on progress/completion. This prevents startup timeout on large deployments.

---

## Pattern 11: Supervisor / observability — built-in metrics

`Boss.supervise()` runs every `superviseIntervalSeconds` (default 60s). It:

1. **Times out stuck jobs:** `failJobsByTimeout()` — fails any active job where `started_on + expire_seconds < now()`
2. **Kills heartbeat-dead jobs:** `failJobsByHeartbeat()` — fails any active job where `heartbeat_on + heartbeat_seconds < now()`  
3. **Updates queue stats cache:** `cacheQueueStats()` writes `deferred_count`, `queued_count`, `active_count`, `total_count` into `pgboss.queue` table
4. **Emits backlog warning:** if `queued_count > warningQueueSize`, emits `warning` event

```js
const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  persistWarnings: true,       // save warnings to pgboss.warning table
  warningRetentionDays: 7,
  warningQueueSize: 500,       // global backlog threshold
  warningSlowQuerySeconds: 10  // alert on slow queries
})

boss.on('warning', ({ message, data }) => {
  logger.warn({ msg: message, ...data })
})

boss.on('wip', (workers) => {
  // Emitted every 2s max when workers are active
  // Each entry: { id, name, state, count, lastJobDuration, lastError }
  for (const w of workers) {
    metrics.gauge('pg_boss_worker_jobs', w.count, { queue: w.name })
  }
})

// Per-queue warning threshold override
await boss.createQueue('instagram-publish', {
  warningQueueSize: 50  // alert earlier for publish queue
})

// Check queue health
const stats = await boss.getQueueStats('content-generate')
// { queuedCount, activeCount, deferredCount, totalCount }
```

**WIP event rate limiting:** `emitWip()` in Manager throttles to once per 2 seconds (`now - wipTs > 2000`). Prevents event flood when many workers are active.

---

## Pattern 12: Worker polling with AbortController for graceful shutdown

`Worker.run()` is a polling loop. On `stop()`, it sets `stopping = true` and aborts the `delay()` promise. The loop exits naturally after the current job completes.

```typescript
// During graceful shutdown:
// 1. boss.stop({ graceful: true, timeout: 30000 })
// 2. manager.stop() → offWork() all workers
// 3. Each worker: stops polling, waits for current job to finish
// 4. boss.stop() waits up to timeout for pendingOffWorkCleanups
// 5. manager.failWip() — marks any still-active jobs as failed

// Workers respect job.signal (AbortSignal):
await boss.work('long-job', async (jobs) => {
  for (const job of jobs) {
    // Check for abort periodically in long-running work
    if (job.signal.aborted) throw new Error('Job aborted during shutdown')
    await doWork(job.data)
  }
})
```

`delay()` in `tools.ts` is an `AbortablePromise` — calls `ac.abort()` which resolves the Node timers/promises `setTimeout` immediately. This is the mechanism for waking up sleeping workers when `notifyWorker()` is called.

---

## News.AI content pipeline — concrete implementation sketch

```typescript
import PgBoss from 'pg-boss'

const boss = new PgBoss({
  connectionString: process.env.SUPABASE_DB_URL,
  schema: 'pgboss',
  migrate: true,
  persistWarnings: true
})

// Queue definitions (call on startup, idempotent via ON CONFLICT DO NOTHING)
await boss.createQueue('rss-parse',       { policy: 'exclusive', retryLimit: 2 })
await boss.createQueue('classify-article', { retryLimit: 3, retryBackoff: true })
await boss.createQueue('generate-content', {
  retryLimit: 5, retryBackoff: true, retryDelay: 30, retryDelayMax: 600,
  deadLetter: 'generate-content-dlq',
  expireInSeconds: 300,       // 5 min for Gemini API call
  heartbeatSeconds: 60
})
await boss.createQueue('publish-post', {
  policy: 'singleton',        // only one publish active per singletonKey (channel)
  retryLimit: 3, retryBackoff: true,
  deadLetter: 'publish-failed'
})
await boss.createQueue('generate-content-dlq')
await boss.createQueue('publish-failed')

// Cron: parse RSS every 15 min per niche
for (const niche of niches) {
  await boss.schedule(`rss-parse`, '*/15 * * * *',
    { nicheName: niche },
    { key: niche, tz: 'UTC' }
  )
}

// Workers
await boss.work('rss-parse', { batchSize: 1 }, async ([job]) => {
  const articles = await parseRSS(job.data.nicheName)
  await boss.insert('classify-article', articles.map(a => ({ data: a })))
})

await boss.work('classify-article', { batchSize: 10, localConcurrency: 3 }, async (jobs) => {
  await Promise.all(jobs.map(async (job) => {
    const score = await classifyWithGPT(job.data)
    if (score >= 7) {
      await boss.send('generate-content', { ...job.data, score },
        { group: { id: job.data.nicheName } }  // group by niche for rate limiting
      )
    }
  }))
})

await boss.work('generate-content', {
  batchSize: 2,
  groupConcurrency: 1,  // max 1 active generation per niche globally
  heartbeatRefreshSeconds: 25
}, async (jobs) => {
  await Promise.all(jobs.map(async (job) => {
    const assets = await generateWithGemini(job.data)
    // Scheduled publishing: send to publish queue with startAfter
    const publishAt = getOptimalPublishTime(job.data.nicheName)
    await boss.send('publish-post', { ...job.data, assets },
      { startAfter: publishAt, singletonKey: job.data.channelId }
    )
  }))
})

await boss.work('publish-failed', async ([job]) => {
  await notifySlack(`Publish failed: ${job.data.articleId}`)
})

boss.on('warning', (w) => logger.warn(w))

await boss.start()
```

---

## Omoikiri WhatsApp message queue — concrete implementation sketch

```typescript
// Queue for outgoing WhatsApp messages — strict FIFO per contact
await boss.createQueue('wa-send', {
  policy: 'key_strict_fifo',
  retryLimit: 3,
  retryDelay: 5,
  retryBackoff: true,
  deadLetter: 'wa-send-dlq',
  expireInSeconds: 60
})

// Queue for AI analysis — singleton per dialog session
await boss.createQueue('dialog-analysis', {
  policy: 'singleton',
  retryLimit: 2,
  expireInSeconds: 120,
  heartbeatSeconds: 30
})

// Send message (replaces in-memory failover queue)
await boss.send('wa-send',
  { sessionId, to: remoteJid, text: message, mediaUrl },
  { singletonKey: remoteJid, priority: isUrgent ? 10 : 0 }
)

// Debounce analysis: multiple messages → one analysis after last message
await boss.sendDebounced('dialog-analysis',
  { dialogSessionId, sessionId },
  { singletonKey: dialogSessionId },
  120  // 2-minute debounce window
)

await boss.work('wa-send', { batchSize: 1 }, async ([job]) => {
  await sendWhatsAppMessage(job.data)
})

await boss.work('dialog-analysis',
  { heartbeatRefreshSeconds: 12 },
  async ([job]) => {
    await runClaudeAnalysis(job.data.dialogSessionId)
  }
)
```

---

## Key learnings for vault

1. `FOR UPDATE SKIP LOCKED` is the entire concurrency primitive — no external lock service needed.
2. Retry + DLQ are computed in a single 3-CTE SQL transaction — atomically decides retry vs fail vs DLQ copy.
3. Cron uses `singletonSeconds: 60` on the internal `__pgboss__send-it` queue to prevent duplicate fires across nodes.
4. Advisory locks (`pg_advisory_xact_lock`) protect migrations and queue creation — safe for concurrent node startup.
5. Migration race condition is caught by an intentional `division by zero` (`version / (version - target)`).
6. All six queue policies are enforced by partial unique indexes only — no application-layer enforcement.
7. `localGroupConcurrency` is in-memory (no DB cost). `groupConcurrency` is DB-tracked (works across nodes).
8. The `db` option accepting any `{ executeSql }` object enables the transactional outbox pattern — enqueue job in same DB transaction as business write.
9. `Bam` class runs heavy async DDL (index creation) in background, preventing startup timeout on large tables.
10. `delay()` returns `AbortablePromise` — calling `.abort()` immediately wakes sleeping workers. Used internally for `notifyWorker()`.

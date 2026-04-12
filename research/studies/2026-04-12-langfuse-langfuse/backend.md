# Langfuse — Backend Deep Dive

**Repo:** `langfuse/langfuse`
**License:** MIT
**Stack:** Next.js (web) + Express (worker) + Prisma + ClickHouse + BullMQ + Redis + S3
**Relevance:** LLM observability SaaS — прямое применение в News.AI для трекинга LLM-вызовов

---

## Monorepo Structure

```
langfuse/
  packages/
    shared/          — types, Zod schemas, Prisma client, queue definitions, ClickHouse client
    config-eslint/
    config-typescript/
  web/               — Next.js app (tRPC API + dashboard)
  worker/            — Express app (BullMQ workers, background jobs)
  ee/                — Enterprise Edition features
  fern/              — OpenAPI/SDK generation
```

Два отдельных деплоя: `web` (Next.js) и `worker` (Express). Shared пакет — единая точка для типов очередей, клиентов БД, логгеров.

---

## Pattern 1: Zod-typed Queue System с полной type safety

Вся система очередей типизирована через один файл `packages/shared/src/server/queues.ts`. Zod-схемы для каждого payload + единый map `TQueueJobTypes`.

```typescript
// packages/shared/src/server/queues.ts

export const IngestionEvent = z.object({
  data: z.object({
    type: z.enum(Object.values(eventTypes)),
    eventBodyId: z.string(),
    fileKey: z.string().optional(),
    skipS3List: z.boolean().optional(),
    forwardToEventsTable: z.boolean().optional(),
  }),
  authCheck: z.object({
    validKey: z.literal(true),
    scope: z.object({ projectId: z.string() }),
  }),
});

export enum QueueName {
  TraceUpsert        = "trace-upsert",
  IngestionQueue     = "ingestion-queue",
  IngestionSecondaryQueue = "secondary-ingestion-queue",
  EvaluationExecution = "evaluation-execution-queue",
  DeadLetterRetryQueue = "dead-letter-retry-queue",
  WebhookQueue       = "webhook-queue",
  // ... 25+ очередей
}

export type TQueueJobTypes = {
  [QueueName.TraceUpsert]: {
    timestamp: Date;
    id: string;
    payload: TraceQueueEventType;
    name: QueueJobs.TraceUpsert;
  };
  [QueueName.IngestionQueue]: {
    timestamp: Date;
    id: string;
    payload: IngestionEventQueueType;
    name: QueueJobs.IngestionJob;
  };
  // ... все остальные
};
```

**Почему важно:** Job processor получает `Job<TQueueJobTypes[QueueName.X]>` — полная type safety без кастов. Если payload schema меняется — TypeScript падает в 20+ местах сразу.

**Применение в News.AI:** Заменить голые строки `queue.add('generate', { articleId })` на типизированные Zod-схемы. Ошибка payload-а поймается на compile time, а не в production.

---

## Pattern 2: WorkerManager — централизованная регистрация workers с метриками

```typescript
// worker/src/queues/workerManager.ts

export class WorkerManager {
  private static workers: { [key: string]: Worker } = {};

  // Оборачивает КАЖДЫЙ processor в метрики автоматически
  private static metricWrapper(processor: Processor, queueName: QueueName): Processor {
    return async (job: Job) => {
      const startTime = Date.now();
      const waitTime = Date.now() - job.timestamp; // время ожидания в очереди

      recordIncrement(convertQueueNameToMetricName(queueName) + ".request");
      recordHistogram(convertQueueNameToMetricName(queueName) + ".wait_time", waitTime, {
        unit: "milliseconds",
      });

      const result = await processor(job);

      // Асинхронно записываем gauge метрики очереди (не блокируем обработку)
      Promise.allSettled([
        queue?.getWaitingCount().then((count) =>
          recordGauge(convertQueueNameToMetricName(queueName) + ".length", count)
        ),
        queue?.getFailedCount().then((count) =>
          recordGauge(convertQueueNameToMetricName(queueName) + ".dlq_length", count)
        ),
        queue?.getActiveCount().then((count) =>
          recordGauge(convertQueueNameToMetricName(queueName) + ".active", count)
        ),
      ]).catch((err) => logger.error("Failed to record queue length", err));

      recordHistogram(
        convertQueueNameToMetricName(queueName) + ".processing_time",
        Date.now() - startTime,
        { unit: "milliseconds" },
      );

      return result;
    };
  }

  public static register(
    queueName: QueueName,
    processor: Processor,
    additionalOptions: Partial<WorkerOptions> = {},
  ): void {
    if (WorkerManager.workers[queueName]) {
      logger.info(`Worker ${queueName} is already registered`);
      return;
    }

    const redisInstance = createNewRedisInstance(redisQueueRetryOptions);
    const worker = new Worker(
      queueName,
      WorkerManager.metricWrapper(processor, queueName), // инжектим метрики
      { connection: redisInstance, prefix: getQueuePrefix(queueName), ...additionalOptions },
    );

    WorkerManager.workers[queueName] = worker;

    // Централизованный error handling
    worker.on("failed", (job, err) => {
      logger.error(`Queue job ${job?.name} with id ${job?.id} in ${queueName} failed`, err);
      traceException(err);
      recordIncrement(convertQueueNameToMetricName(queueName) + ".failed");
    });

    worker.on("error", (failedReason) => {
      logger.error(`Queue job ${queueName} errored: ${failedReason}`, failedReason);
      traceException(failedReason);
      recordIncrement(convertQueueNameToMetricName(queueName) + ".error");
    });
  }

  public static async closeWorkers(): Promise<void> {
    await Promise.all(Object.values(WorkerManager.workers).map((w) => w.close()));
    logger.info("All workers have been closed.");
  }
}

// Регистрация в app.ts:
if (env.QUEUE_CONSUMER_TRACE_UPSERT_QUEUE_IS_ENABLED === "true") {
  WorkerManager.register(QueueName.TraceUpsert, traceUpsertProcessor, { concurrency: 50 });
}
```

**Почему важно:** Каждый новый worker получает метрики БЕСПЛАТНО — не надо помнить добавить histogram/gauge. Feature-флаги (`QUEUE_CONSUMER_X_IS_ENABLED`) позволяют деплоить worker-process с любым подмножеством консьюмеров.

**Применение в News.AI:** Вместо разбросанных `new Worker(...)` по сервисам — один `WorkerManager.register()` с автоматическим трекингом.

---

## Pattern 3: Sharded BullMQ Queues для горизонтального масштабирования

```typescript
// packages/shared/src/server/redis/ingestionQueue.ts

export class IngestionQueue {
  // Map<shardIndex, Queue> — несколько инстансов одной логической очереди
  private static instances: Map<number, Queue<...> | null> = new Map();

  public static getInstance({
    shardingKey,
    shardName,
  }: {
    shardingKey?: string;  // "projectId-eventBodyId" — для routing
    shardName?: string;    // "ingestion-queue-2" — для workers
  }): Queue<...> | null {
    const shardIndex =
      IngestionQueue.getShardIndexFromShardName(shardName) ??
      (env.REDIS_CLUSTER_ENABLED === "true" && shardingKey
        ? getShardIndex(shardingKey, env.LANGFUSE_INGESTION_QUEUE_SHARD_COUNT)
        : 0);

    if (IngestionQueue.instances.has(shardIndex)) {
      return IngestionQueue.instances.get(shardIndex) || null;
    }

    const name = `${QueueName.IngestionQueue}${shardIndex > 0 ? `-${shardIndex}` : ""}`;
    const queueInstance = newRedis
      ? new Queue(name, {
          connection: newRedis,
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: 100_000,  // сохраняем много — для DLQ retry
            attempts: 6,
            backoff: { type: "exponential", delay: 5000 },
          },
        })
      : null;

    IngestionQueue.instances.set(shardIndex, queueInstance);
    return queueInstance;
  }
}

// Функция sharding через SHA-256:
// packages/shared/src/server/redis/sharding.ts
export function getShardIndex(key: string, shardCount: number): number {
  if (shardCount <= 1) return 0;
  const hash = createHash("sha256").update(key).digest("hex");
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return hashInt % shardCount;
}
```

**Вторичная очередь для изоляции high-throughput проектов:**
```typescript
// В ingestionQueue.ts processor:
const shouldRedirectEnv = projectIdsToRedirectToSecondaryQueue.includes(projectId);
const shouldRedirectSlowdown = await hasS3SlowdownFlag(projectId);

if (enableRedirectToSecondaryQueue && (shouldRedirectEnv || shouldRedirectSlowdown)) {
  const shardingKey = `${projectId}-${job.data.payload.data.eventBodyId}`;
  const secondaryQueue = SecondaryIngestionQueue.getInstance({ shardingKey });
  await secondaryQueue.add(QueueName.IngestionSecondaryQueue, job.data);
  return; // не обрабатываем в primary
}
```

**Почему важно:** Один "шумный сосед" (проект с огромным трафиком или S3 SlowDown) не блокирует всех остальных — его джобы перекидываются в изолированную secondary очередь.

**Применение в News.AI:** Если добавить несколько клиентов (multi-tenant) — шардирование по `clientId` предотвратит монополизацию очереди одним клиентом.

---

## Pattern 4: S3-first Ingestion Pipeline с Redis dedup cache

Langfuse не пишет напрямую в ClickHouse при получении события. Вместо этого — двухфазный pipeline:

```
SDK → POST /api/public/ingestion
  ↓ (1) Upload events to S3 (key: projectId/entityType/eventBodyId/fileKey.json)
  ↓ (2) Add job to BullMQ: { eventBodyId, fileKey, type }
  ↓ [5 seconds delay to batch updates]
  Worker picks up job
  ↓ (3) Check Redis dedup cache
  ↓ (4) List all files in S3 prefix (all updates for this entity)
  ↓ (5) Download + merge events (last-write-wins by timestamp)
  ↓ (6) Write merged result to ClickHouse
```

```typescript
// packages/shared/src/server/ingestion/processEventBatch.ts

// Фаза 1: Группировка по eventBodyId и upload в S3
const sortedBatchByEventBodyId = sortedBatch.reduce((acc, event) => {
  const key = `${getClickhouseEntityType(event.type)}-${event.body.id}`;
  if (!acc[key]) acc[key] = { data: [], key: event.id, type: event.type, eventBodyId: event.body.id };
  acc[key].data.push(event);
  return acc;
}, {});

await Promise.allSettled(
  Object.keys(sortedBatchByEventBodyId).map(async (id) => {
    const { data, key, type, eventBodyId } = sortedBatchByEventBodyId[id];
    const bucketPath = `${prefix}${projectId}/${entityType}/${eventBodyId}/${key}.json`;
    return s3Client.uploadJson(bucketPath, data); // массив событий — один файл
  })
);

// Фаза 2: Добавление в очередь с задержкой 5s
await queue.add(QueueJobs.IngestionJob, {
  payload: {
    data: { type, eventBodyId, fileKey, skipS3List },
    authCheck: { ... }
  }
}, { delay: Math.min(5000, env.LANGFUSE_INGESTION_QUEUE_DELAY_MS) });
```

```typescript
// worker/src/queues/ingestionQueue.ts — Фаза 3-6

// Dedup через Redis: пропустить если уже обрабатывали
const key = `langfuse:ingestion:recently-processed:${projectId}:${type}:${eventBodyId}:${fileKey}`;
const exists = await redis.exists(key);
if (exists) return; // skip duplicate

// Список всех файлов для этого eventBodyId (все updates от разных SDK вызовов)
const eventFiles = await s3Client.listFiles(s3Prefix);

// Параллельная загрузка батчами
const batches = chunk(eventFiles, env.LANGFUSE_S3_CONCURRENT_READS);
for (const batch of batches) {
  const batchEvents = await Promise.all(batch.map(downloadAndParseFile));
  events.push(...batchEvents.flat());
}

// Записываем "seen" ключи в Redis (TTL 5 минут)
await Promise.all(
  eventFiles.map(e => redis.set(
    `langfuse:ingestion:recently-processed:${projectId}:${type}:${eventBodyId}:${key}`,
    "1", "EX", 60 * 5
  ))
);

// Merge и запись в ClickHouse
await new IngestionService(redis, prisma, clickhouseWriter, clickhouseClient())
  .mergeAndWrite(entityType, projectId, eventBodyId, firstS3WriteTime, events);
```

**Ключевая деталь — сортировка батча перед обработкой:** update-события ставятся ПОСЛЕ create-событий, независимо от порядка поступления:
```typescript
const sortBatch = (batch) => {
  const updateEvents = [eventTypes.GENERATION_UPDATE, eventTypes.SPAN_UPDATE];
  const updates = batch.filter(e => updateEvents.includes(e.type)).sort(byTimestamp);
  const others  = batch.filter(e => !updateEvents.includes(e.type)).sort(byTimestamp);
  return [...others, ...updates]; // creates first, then updates
};
```

**Почему важно:** SDK может слать `span-create` и `span-update` в одном вызове. Без сортировки update может обработаться раньше create — данные потеряются. S3 как staging layer позволяет мержить все апдейты за 5 секунд в одну запись ClickHouse.

**Применение в News.AI:** Та же проблема — артикул может апдейтиться несколько раз пока пайплайн работает. S3-first + dedup cache — элегантное решение без distributed locks.

---

## Pattern 5: ClickhouseWriter — in-memory batch buffer с adaptive splitting

Singleton, который накапливает записи в памяти и пишет в ClickHouse по батчам.

```typescript
// worker/src/services/ClickhouseWriter/index.ts

export class ClickhouseWriter {
  private static instance: ClickhouseWriter | null = null;
  batchSize: number;
  writeInterval: number;
  queue: ClickhouseQueue; // { traces: [], observations: [], scores: [], ... }
  isIntervalFlushInProgress: boolean;

  private start() {
    this.intervalId = setInterval(() => {
      if (this.isIntervalFlushInProgress) return; // skip if previous flush still running

      this.isIntervalFlushInProgress = true;
      this.flushAll().finally(() => {
        this.isIntervalFlushInProgress = false;
      });
    }, this.writeInterval);
  }

  public addToQueue<T extends TableName>(tableName: T, data: RecordInsertType<T>) {
    this.queue[tableName].push({ createdAt: Date.now(), attempts: 1, data });

    if (this.queue[tableName].length >= this.batchSize) {
      this.flush(tableName).catch(...); // flush early if batch full
    }
  }

  private async flush<T extends TableName>(tableName: T, fullQueue = false) {
    const queueItems = entityQueue.splice(0, fullQueue ? entityQueue.length : this.batchSize);

    // Clamp Decimal64(12) overflow ПЕРЕД записью
    let recordsToWrite = queueItems.map(item => this.clampDecimal64Fields(tableName, item.data));

    await backOff(
      async () => this.writeToClickhouse({ table: tableName, records: recordsToWrite }),
      {
        numOfAttempts: this.maxAttempts,
        retry: (error, attemptNumber) => {
          if (this.isRetryableError(error)) return true; // socket hang up

          if (this.isStringLengthError(error)) {
            // JS string size limit при конкатенации — сплитим батч пополам
            const { retryItems, requeueItems } = this.handleStringLengthError(tableName, queueItems);
            recordsToWrite = retryItems.map(i => i.data);
            entityQueue.unshift(...requeueItems); // реставрируем вторую половину
            return true;
          }

          if (this.isSizeError(error) && !hasBeenTruncated) {
            // ClickHouse "extremely large JSON object" — усекаем input/output поля до 1MB
            recordsToWrite = recordsToWrite.map(r => this.truncateOversizedRecord(tableName, r));
            hasBeenTruncated = true;
            return true;
          }

          return false; // non-retryable
        },
        startingDelay: 100, timeMultiple: 1, maxDelay: 100,
      }
    );
  }

  private truncateOversizedRecord<T extends TableName>(tableName: T, record): RecordInsertType<T> {
    const maxFieldSize = 1024 * 1024; // 1MB
    // Усекаем input, output, metadata если > 1MB
    if ("input" in record && record.input?.length > maxFieldSize) {
      record.input = record.input.substring(0, 500 * 1024) + "[TRUNCATED: Field exceeded size limit]";
    }
    // ... аналогично output, metadata
    return record;
  }
}
```

**Почему важно:** LLM input/output может быть гигантским. ClickHouse отвергает "extremely large JSON" — без truncation один большой LLM вызов ломает весь батч. Adaptive splitting (пополам при string length error) — элегантное решение без hardcoded limits на размер батча.

**Применение в News.AI:** При логировании LLM prompt/response в будущую observability систему — те же проблемы с большими GPT-4 контекстами.

---

## Pattern 6: tRPC middleware stack с многоуровневым auth

```typescript
// web/src/server/api/trpc.ts

// 1. Базовая процедура — OTel трейсинг на всех
const withOtelTracingProcedure = t.procedure
  .use(withOtelInstrumentation) // propagate baggage headers
  .use(tracing({ collectInput: true, collectResult: true })); // baselime middleware

// 2. Global error handler — стандартизирует все ошибки
const withErrorHandling = t.middleware(async ({ ctx, next }) => {
  const res = await next({ ctx });

  if (!res.ok) {
    if (res.error.cause instanceof ClickHouseResourceError) {
      // ClickHouse errors — понятное сообщение пользователю
      res.error = new TRPCError({ code: "UNPROCESSABLE_CONTENT", message: ClickHouseResourceError.ERROR_ADVICE_MESSAGE });
    } else {
      const { code, httpStatus } = resolveError(res.error);
      const isSafeToExpose = httpStatus >= 400 && httpStatus < 500; // 4xx — показываем, 5xx — скрываем
      const safeMessage = isLangfuseCloud
        ? "We have been notified and are working on it."
        : "Please check error logs in your self-hosted deployment.";

      res.error = new TRPCError({
        code,
        cause: null, // НЕ пробрасываем стек
        message: isSafeToExpose ? res.error.message : "Internal error. " + safeMessage,
      });
    }
  }
  return res;
});

// 3. Уровни авторизации — от публичного до project-specific
export const publicProcedure = withOtelTracingProcedure.use(withErrorHandling);

export const authenticatedProcedure = withOtelTracingProcedure
  .use(withErrorHandling)
  .use(enforceUserIsAuthed); // проверяем session

export const protectedProjectProcedure = withOtelTracingProcedure
  .use(withErrorHandling)
  .use(enforceUserIsAuthedAndProjectMember); // + проверяем membership в проекте

// 4. Специальная процедура для trace view — публичные traces
export const protectedGetTraceProcedure = withOtelTracingProcedure
  .use(withErrorHandling)
  .use(enforceTraceAccess); // trace.public || session member || admin

// 5. Admin API — отдельный ключ, не сессия
export const adminProcedure = withOtelTracingProcedure
  .use(withErrorHandling)
  .use(enforceAdminAuth); // AdminApiAuthService.verifyAdminAuthFromAuthString(key)
```

**Логирование ошибок по severity:**
```typescript
const logErrorByCode = (errorCode, error) => {
  if (errorCode === "NOT_FOUND" || errorCode === "UNAUTHORIZED") {
    logger.info(...);   // ожидаемые — не спамим
  } else if (errorCode === "UNPROCESSABLE_CONTENT") {
    logger.warn(...);   // validation errors
  } else {
    logger.error(...);  // 5xx — полный лог
  }
};
```

**Почему важно:** Дифференцированное логирование — `NOT_FOUND` логируется как `info`, не `error`. Без этого Railway logs забиваются 401/404 и настоящие ошибки тонут.

**Применение в News.AI Brain:** При добавлении tRPC поверх текущих Express endpoints — этот middleware stack можно взять почти дословно.

---

## Pattern 7: Dual API key hashing — bcrypt legacy + SHA-256 fast path

```typescript
// packages/shared/src/server/auth/apiKeys.ts

export async function createAndAddApiKeysToDb(p: {
  prisma: PrismaClient;
  entityId: string;
  scope: ApiKeyScope;
}) {
  const { pk, sk } = await generateKeySet();
  // pk = "pk-lf-{uuid}", sk = "sk-lf-{uuid}"

  const hashedSk = await hashSecretKey(sk);       // bcrypt(sk, 11) — legacy, медленный
  const displaySk = getDisplaySecretKey(sk);       // "sk-lf-..." → "sk-lf...uuid[-4:]"
  const hashFromProvidedKey = createShaHash(sk, salt); // SHA-256(sk + SHA-256(salt)) — быстрый

  await prisma.apiKey.create({
    data: {
      hashedSecretKey: hashedSk,           // bcrypt — для обратной совместимости
      fastHashedSecretKey: hashFromProvidedKey, // SHA-256 — для быстрой верификации
      displaySecretKey: displaySk,
      publicKey: pk,
      ...
    }
  });
}

export function createShaHash(privateKey: string, salt: string): string {
  return crypto
    .createHash("sha256")
    .update(privateKey)
    .update(crypto.createHash("sha256").update(salt, "utf8").digest("hex"))
    .digest("hex");
}
```

**Почему важно:** bcrypt с factor=11 занимает ~100ms per verification — катастрофа при высоком трафике API. Миграция: при первом использовании старого ключа вычисляется SHA-256 и сохраняется в `fastHashedSecretKey`. Последующие проверки — только SHA-256 (< 1ms).

**Кэш в Redis:** При каждом API запросе Langfuse НЕ ходит в Postgres — ключ кэшируется в Redis с TTL. Sentinel значение `"api-key-non-existent"` кэширует даже несуществующие ключи для защиты от enumeration attacks:
```typescript
export const CachedApiKey = z.union([OrgEnrichedApiKey, z.literal("api-key-non-existent")]);
```

**Применение в News.AI:** Текущий Brain использует env-переменную `API_KEY` для одного ключа. При росте до multi-tenant нужна эта схема: SHA-256 fast path + Redis cache + `compare_digest` (уже есть в Python версии).

---

## Pattern 8: Deterministic Trace Sampling через SHA-256

```typescript
// packages/shared/src/server/ingestion/sampling.ts

export function isTraceIdInSample(params: {
  projectId: string | null;
  event: IngestionEventType;
}): { isSampled: boolean; isSamplingConfigured: boolean } {
  const sampledProjects = env.LANGFUSE_INGESTION_PROCESSING_SAMPLED_PROJECTS;

  if (!projectId || !sampledProjects.has(projectId))
    return { isSampled: true, isSamplingConfigured: false };

  const sampleRate = sampledProjects.get(projectId);
  const traceId = parseTraceId(event);

  return { isSampled: isInSample(traceId, sampleRate), isSamplingConfigured: true };
}

function isInSample(traceId: string, sampleRate: number): boolean {
  if (sampleRate === 0) return false;
  if (sampleRate === 1) return true;

  // Детерминированный sampling: один и тот же traceId всегда попадает/не попадает
  const hash = crypto.createHash("sha256").update(traceId).digest("hex");
  const hashInt = parseInt(hash.substring(0, 8), 16);
  const normalizedHash = hashInt / 0xffffffff; // 0..1

  return normalizedHash < sampleRate; // sampleRate=0.1 → 10% трейсов
}
```

**Почему важно:** Random sampling даёт непредсказуемые результаты — один запрос может быть залогирован, retry того же запроса — нет. SHA-256 детерминирован: если `sampleRate=0.5`, то trace `abc123` всегда либо попадает, либо нет. Все spans одного trace сэмплируются согласованно.

**Применение в News.AI:** При высоких объёмах LLM-вызовов — детерминированный sampling по `articleId` позволит сохранить полный трейс для выбранных статей, а не случайные фрагменты.

---

## Pattern 9: S3 SlowDown adaptive routing

Когда S3 начинает возвращать `SlowDown` errors (rate limit), проект временно помечается в Redis и его трафик перенаправляется в secondary queue с меньшим concurrency:

```typescript
// packages/shared/src/server/redis/s3SlowdownTracking.ts

export async function markProjectS3Slowdown(projectId: string): Promise<void> {
  if (!redis || !isSlowdownEnabled()) return;

  const key = `langfuse:s3-slowdown:${projectId}`;
  await redis.set(key, "1", "EX", env.LANGFUSE_S3_RATE_ERROR_SLOWDOWN_TTL_SECONDS);
  // TTL через N секунд флаг снимается, проект возвращается в primary queue
}

export async function hasS3SlowdownFlag(projectId: string): Promise<boolean> {
  if (!redis || !isSlowdownEnabled()) return false;
  const result = await redis.get(`langfuse:s3-slowdown:${projectId}`);
  return result === "1";
  // Fail-open: если Redis недоступен — не редиректим
}
```

**Два триггера для redirect в secondary queue:**
1. `env.LANGFUSE_SECONDARY_INGESTION_QUEUE_ENABLED_PROJECT_IDS` — статический список (high-volume clients)
2. `hasS3SlowdownFlag(projectId)` — динамический (автоматическая реакция на S3 rate limits)

**Почему важно:** S3 SlowDown для одного проекта (burst трафик) не должен тормозить весь кластер. Redis TTL как time-window circuit breaker — изящнее чем счётчики ошибок.

**Применение в News.AI:** Аналогичная логика для Gemini rate limits — при `429` помечать в Redis и темпорально переключаться на другой провайдер или замедлять генерацию для данного niche.

---

## Pattern 10: Dead Letter Queue с cron retry

```typescript
// packages/shared/src/server/redis/dlqRetryQueue.ts

export class DeadLetterRetryQueue {
  public static getInstance(): Queue | null {
    // ...
    // Добавляем cron job при инициализации очереди
    DeadLetterRetryQueue.instance.add(
      QueueJobs.DeadLetterRetryJob,
      { timestamp: new Date() },
      { repeat: { pattern: "0 */10 * * * *" } } // каждые 10 минут
    );
    return DeadLetterRetryQueue.instance;
  }
}

// worker/src/services/dlq/dlqRetryService.ts
export class DlqRetryService {
  private static retryQueues = [
    QueueName.ProjectDelete,
    QueueName.TraceDelete,
    QueueName.ScoreDelete,
    QueueName.BatchActionQueue,
    QueueName.DataRetentionProcessingQueue,
  ] as const;

  public static async retryDeadLetterQueue() {
    for (const queueName of DlqRetryService.retryQueues) {
      const queue = getQueue(queueName);
      const failedJobs = await queue.getFailed();

      for (const job of failedJobs) {
        const dlxDelay = Date.now() - job.data.timestamp;
        recordHistogram("langfuse.dlq_retry_delay", dlxDelay, {
          unit: "milliseconds",
          projectId: job.data.payload.projectId,
          queueName,
        });
        await job.retry();
      }
    }
  }
}
```

**Почему важно:** BullMQ `removeOnFail: 100_000` — сохраняем до 100к failed jobs. DLQ retry каждые 10 минут автоматически перезапускает их. Метрика `dlq_retry_delay` показывает насколько долго джоб лежал мёртвым — важный SLA индикатор.

**Применение в News.AI:** Текущая проблема — упавший publish job теряется навсегда. С этим паттерном Publisher failures автоматически ретраятся без ручного вмешательства.

---

## Pattern 11: Winston logger с OTel baggage propagation

```typescript
// packages/shared/src/server/logger.ts

const tracingFormat = function () {
  return winston.format((info) => {
    const span = getCurrentSpan();
    if (span) {
      const { spanId, traceId } = span.spanContext();
      const traceIdEnd = traceId.slice(traceId.length / 2);
      info["dd.trace_id"] = BigInt(`0x${traceIdEnd}`).toString(); // Datadog format
      info["dd.span_id"] = BigInt(`0x${spanId}`).toString();
      info["trace_id"] = traceId;
      info["span_id"] = spanId;
    }

    // Пробрасываем baggage (projectId, userId) из OTel context в каждый лог
    const baggage = propagation.getBaggage(context.active());
    if (baggage) {
      baggage.getAllEntries().forEach(([k, v]) => (info[k] = v.value));
    }
    return info;
  })();
};

export const logger = getWinstonLogger(env.NODE_ENV, env.LANGFUSE_LOG_LEVEL);
// LANGFUSE_LOG_FORMAT=text → человекочитаемый (dev)
// LANGFUSE_LOG_FORMAT=json → JSON structured (prod)
```

**Почему важно:** Каждый `logger.error(...)` автоматически включает `trace_id`, `span_id`, `projectId` из OTel context — без явной передачи в каждый вызов. В Railway logs можно фильтровать по `projectId` через JSON поиск.

**Применение в News.AI:** Текущий Pino логгер логирует `{ provider, latencyMs, outcome, articleId }` явно. Переход на OTel baggage propagation устранит эту дублированность — контекст будет автоматически добавляться.

---

## Архитектурные выводы для News.AI

### Что можно взять сейчас

1. **Typed queue schemas** (Pattern 1) — добавить Zod к BullMQ payload. 2 часа работы, устраняет класс runtime ошибок.

2. **WorkerManager** (Pattern 2) — централизовать все `new Worker()` в Brain/Generator/Publisher. Метрики queue length/wait_time/processing_time получаем бесплатно.

3. **DLQ retry** (Pattern 10) — Publisher failures сейчас теряются. Cron retry решает это без ручного мониторинга.

4. **Differentiated error logging** (Pattern 6) — 404/401 как `info`, не `error`. Убирает шум в Railway logs.

### Что релевантно при масштабировании

5. **SHA-256 fast API key hashing** (Pattern 7) — при переходе к multi-tenant/multi-user
6. **Sharded queues** (Pattern 3) — при высоком объёме (1000+ статей/час)
7. **S3-first pipeline** (Pattern 4) — при ненадёжных downstream сервисах (Gemini throttling)
8. **Deterministic sampling** (Pattern 8) — при высокой стоимости LLM observability

### Чего НЕТ и что пришлось бы добавить

- **Prisma для метаданных + ClickHouse для events** — двойная БД сложна в эксплуатации. Для News.AI достаточно одного Supabase.
- **Redis Cluster sharding** — избыточно для текущего масштаба.
- **S3 event staging** — нужен только если update-события приходят out-of-order.

---

## Технологический стек

| Слой | Технология |
|---|---|
| Dashboard API | tRPC v11 + Next.js |
| Ingestion API | Next.js API routes (REST) |
| Background jobs | BullMQ + Redis |
| Primary DB | PostgreSQL (Prisma) |
| Analytics DB | ClickHouse (async insert) |
| Event staging | S3-compatible (MinIO/AWS) |
| Logger | Winston + OTel |
| Retry | `exponential-backoff` library |
| Auth | NextAuth.js (sessions) + bcrypt/SHA-256 (API keys) |
| Validation | Zod (everywhere) |

Last verified: 2026-04-12

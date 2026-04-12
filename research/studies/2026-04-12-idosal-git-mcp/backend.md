# git-mcp — Backend Analysis

**Date:** 2026-04-12
**Repo:** idosal/git-mcp
**Score:** 8.2
**Stack:** TypeScript, Cloudflare Workers, McpAgent, KV, R2, Vectorize, Durable Objects, AutoRAG

---

## Architecture Overview

git-mcp — MCP-сервер на Cloudflare Workers, который превращает любой GitHub-репозиторий в документационный контекст для LLM/AI-агентов. Работает через URL-паттерны:
- `gitmcp.io/{owner}/{repo}` — прямой GitHub-репозиторий
- `{owner}.gitmcp.io/{repo}` — subdomain-паттерн (маппится на GitHub Pages)

Entrypoint: `src/index.ts` — Worker `fetch()` определяет тип запроса и маршрутизирует в `MyMCP extends McpAgent` (SSE или streamable HTTP) или в React Router SPA.

---

## Паттерн 1: Request-scoped MCP agent с динамическим URL

`MyMCP extends McpAgent` регистрирует инструменты в `init()`, получая URL запроса из `this.props.requestUrl`. Каждое подключение — отдельный экземпляр агента с уже вычисленным `repoData`.

```typescript
export class MyMCP extends McpAgent {
  server = new McpServer({ name: "GitMCP", version: "1.1.0" });

  async init() {
    const requestUrl = this.props.requestUrl as string;
    const repoData = getRepoData({ requestHost: host, requestUrl: canonicalUrl });
    getMcpTools(env, host, canonicalUrl, ctx).forEach((tool) => {
      this.server.tool(tool.name, tool.description, tool.paramsSchema,
        withViewTracking(env, ctx, repoData, async (args) => tool.cb(args)),
        tool.annotations ? { annotations: tool.annotations } : undefined,
      );
    });
  }
}
```

Ключевое: `url.searchParams` чистятся перед канонизацией (только `sessionId` сохраняется). Это критично для корректного cache-keying.

**Применение для vault-research-agent:** тот же паттерн — MCP-агент может получать параметры из URL, не из тела запроса. Каждый "контекст" (vault path, проект) разный URL = разный набор инструментов.

---

## Паттерн 2: URL-driven handler registry с typed key composition

`getHandlerByRepoData()` использует составной ключ `${urlType}::${owner}/${repo}` для маппинга репозиторий → специализированный обработчик. Fallback — `getDefaultRepoHandler()`.

```typescript
type UrlTypeRepoKey = `${UrlType}::${RepoKey}`;
type AllRepoKey = `all::${RepoKey}`;

const handlers: RepoHandlerMap = {
  "all::mrdoob/three.js": getThreejsRepoHandler(),
  "all::docs/": getGenericRepoHandler(),
  "all::remix-run/react-router": getReactRouterRepoHandler(),
};

export function getHandlerByRepoData(repoData: RepoData): RepoHandler {
  return (
    handlers[`${repoData.urlType}::${repoKey}`] ??
    handlers[`all::${repoKey}`] ??
    getDefaultRepoHandler()
  );
}
```

Все обработчики — синглтоны (модульная переменная + guard). Интерфейс `RepoHandler` требует `getTools()`, `fetchDocumentation()`, `searchRepositoryDocumentation()`.

**Применение для Nexus:** аналог `router.py` — можно строить registry intent → handler с typed lookup вместо if-elif цепочки.

---

## Паттерн 3: Многоуровневая стратегия поиска документации с fallback

`fetchDocumentation()` применяет водопад источников:

1. **KV cache** — проверяется первым (30-минутный TTL)
2. **Статические пути** — `docs/docs/llms.txt`, `llms.txt`, `docs/llms.txt` в параллели через `Promise.all`
3. **GitHub Search API** — поиск `filename:llms.txt` если статические пути дали null
4. **R2 bucket** — pre-generated `llms.txt` (заранее сгенерированные для популярных репозиториев)
5. **README fallback** — поиск `README+path:/` через GitHub Search API

```typescript
// Execute all fetch promises in parallel
const results = await Promise.all(
  fetchPromises.map(async ({ promise, location, branch }) => {
    const content = await promise;
    return { content, location, branch };
  }),
);
```

После отдачи результата — `ctx.waitUntil()` для асинхронного кэширования и постановки в очередь на дальнейшую обработку. Ответ клиенту не блокируется.

**Применение для vault-research-agent:** этот водопад (cache → static → search API → generated → readme) — готовый шаблон для любого парсера. `ctx.waitUntil()` аналог Nexus `asyncio.create_task()`.

---

## Паттерн 4: Dual-path semantic search (AutoRAG + naive fallback)

`searchRepositoryDocumentation()` сначала проверяет наличие файла в R2 (`env.DOCS_BUCKET.head()`), и только если он есть — пробует Cloudflare AutoRAG с фильтрацией по `folder` prefix:

```typescript
const searchRequest = {
  query: query,
  rewrite_query: true,
  max_num_results: 12,
  ranking_options: { score_threshold: 0.4 },
  filters: {
    type: "and",
    filters: [
      { type: "gte", key: "folder", value: `${repoPrefix}` },
      { type: "lte", key: "folder", value: `${repoPrefix}~` },  // ~ > / в ASCII, охватывает всё поддерево
    ],
  },
};
const answer = await env.AI.autorag("docs-rag").search(searchRequest);
```

Если AutoRAG вернул пустой результат — fallback к `searchRepositoryDocumentationNaive()` который просто возвращает весь документ с объяснением что поиск не дал результата.

`rewrite_query: true` — AutoRAG сам переформулирует запрос перед поиском.

**Применение для Nexus документации Q&A:** паттерн `prefix_gte + prefix_lte` с тильдой — стандартный способ делать prefix filter в системах без нативного prefix-поиска.

---

## Паттерн 5: KV cache с jitter TTL против thundering herd

```typescript
const BASE_TTL = 60 * 60 * 12; // 12 hours
const JITTER_FACTOR = 0.2; // 20%

function getCacheTTL(): number {
  const jitterAmount = BASE_TTL * JITTER_FACTOR;
  const jitter = Math.random() * (jitterAmount * 2) - jitterAmount;
  return Math.floor(BASE_TTL + jitter);
}
```

Все объекты кэшируются с TTL = BASE ± 20%. Без jitter все записи от одного момента истекают синхронно → spike на GitHub API. С jitter — равномерный renewal.

Структура cache keys:
- `repo:{owner}:{repo}` — путь к файлу документации
- `fetch_doc:{owner}:{repo}` — полный результат fetchDocumentation
- `vector_exists:{owner}:{repo}` — флаг наличия векторов
- `robotstxt:{domain}` — распарсенные правила robots.txt
- `url_content:{format}:{url}` — контент URL

Каждый тип — отдельная функция-конструктор ключа. Дополнительно: Cloudflare tiered cache через `cf: { cacheEverything: true, cacheTtlByStatus: {...} }` в нативном `fetch()`.

**Применение для News.AI:** TTL jitter — применять ко всем BullMQ scheduled jobs чтобы не все источники опрашивались одновременно.

---

## Паттерн 6: Durable Object как буферизованный счётчик

`ViewCounterDO` — буферизует инкременты в памяти, фlusит в DO Storage каждые 5 секунд через `setTimeout` или `state.storage.setAlarm()`:

```typescript
private bufferIncrement(key: string, amount: number = 1): number {
  const currentBufferAmount = this.buffer.get(key) || 0;
  this.buffer.set(key, currentBufferAmount + amount);

  const persistedCount = this.counts.get(key) || 0;
  const currentTotal = persistedCount + (currentBufferAmount + amount);

  if (this.bufferTimer === null) {
    this.bufferTimer = setTimeout(() => this.flushBuffer(), this.BUFFER_TIME_MS);
  }
  return currentTotal;
}
```

Alarm-based flush работает даже когда запросов нет. В test environment — `setAlarm` недоступен, есть guard: `this.isTestEnvironment = !this.state.storage.setAlarm`.

**Применение:** аналог этого паттерна в Node.js — накапливать события в памяти + `setInterval` flush в БД. Уже используем в News.AI для batch-вставок.

---

## Паттерн 7: динамические имена MCP-инструментов с length enforcement

MCP-протокол имеет ограничение: `server_name + tool_name <= 51 символов`. `enforceToolNameLengthLimit()` обеспечивает соответствие:

```typescript
export function enforceToolNameLengthLimit(prefix, repo, suffix): string {
  const serverNameLen = generateServerName(repo).length;
  let toolName = `${prefix}${repo.replace(/[^a-zA-Z0-9]/g, "_")}${suffix}`;

  if (toolName.length + serverNameLen <= LIMIT) return toolName;

  // Shorten suffix: "_documentation" → "_docs"
  const shorterSuffix = suffix === "_documentation" ? "_docs" : suffix;
  // Remove words from end one by one
  const words = repoName.split("_");
  for (let i = words.length - 1; i > 0; i--) {
    toolName = `${prefix}${words.slice(0, i).join("_")}${shorterSuffix}`;
    if (toolName.length + serverNameLen <= LIMIT) return toolName;
  }
  return `${prefix}repo${shorterSuffix}`;
}
```

Генерирует: `fetch_react_router_documentation` для `remix-run/react-router`.

---

## Паттерн 8: robots.txt как first-class citizen

Перед любым fetch внешнего URL — `fetchFileWithRobotsTxtCheck()` проверяет robots.txt:

1. KV cache для правил robots.txt домена
2. Если не кэшировано — fetch `https://{domain}/robots.txt`
3. Парсинг в `RobotsRule[]` (User-agent, Allow, Disallow)
4. `allow` rules имеют приоритет над `disallow`
5. 404 на robots.txt = разрешено

Применяется к llms.txt, index.html, README.md — ко всем документам. При блокировке — возвращает явное сообщение в MCP-ответе вместо ошибки.

---

## Паттерн 9: GitHub API клиент с in-process rate limiting

`githubClient.ts` — модульный singleton состояния rate limit:

```typescript
let apiRateLimit: RateLimitInfo = {
  remaining: 5000,
  resetTime: null,
  limit: 5000,
};

async function respectRateLimits(): Promise<void> {
  if (apiRateLimit.remaining < 5 && apiRateLimit.resetTime) {
    const timeUntilReset = apiRateLimit.resetTime.getTime() - Date.now();
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(timeUntilReset + 1000, 60000))
    );
  } else {
    await new Promise((resolve) => setTimeout(resolve, DEFAULT_DELAY)); // 1000ms
  }
}
```

Каждый ответ обновляет `x-ratelimit-remaining` и `x-ratelimit-reset`. При 403 + "rate limit exceeded" — ретрай с ожиданием до reset, до 3 попыток.

**Замечание:** в-process state теряется при каждом новом Cloudflare Worker isolate. Для настоящего rate limiting нужен KV или DO.

---

## Паттерн 10: llms.txt как машино-читаемый стандарт документации

Весь сервис построен вокруг `llms.txt` — markdown-файл в корне репозитория, специально написанный для LLM-потребления (без скриншотов, кратко, структурированно). Это эмерджентный стандарт (llmstxt.org).

Иерархия поиска: `docs/docs/llms.txt` → `llms.txt` → `docs/llms.txt` → GitHub Search → R2 generated → README.

Для subdomain-паттерна (GitHub Pages): ищется `llms.txt` на сайте, fallback к HTML → конвертация через `html-to-md`.

---

## Связь с нашими проектами

### vault-research-agent (парсер)

Паттерн 2 (handler registry) применим напрямую: `{category}::{tool_name}` → специализированный парсер. Водопад fallback (паттерн 3) — шаблон для поиска документации по любому инструменту.

### Nexus (documentation Q&A)

1. Паттерн 4 (AutoRAG с prefix filter `gte + lte~`) — можно использовать для поиска по Vault с фильтрацией по папке проекта
2. Паттерн 10: добавить `llms.txt` в корень каждого проекта Adil'а → Nexus сможет читать актуальную документацию через git-mcp вместо vault_reader.py
3. Паттерн 5 (jitter TTL) — применить к `vault_reader.py` кэшированию

### Omoikiri / News.AI

Паттерн 6 (buffered counter DO) — аналог для Node: накапливать события в памяти, flush каждые N секунд в pg/supabase. Уже делаем в News.AI, но без alarm-based fallback flush.

---

## Что НЕ стоит копировать

- `vectorStore.ts` — `getEmbeddings()` это самодельный hash-based embedding (не настоящий ML). Пометка в коде: "In production use OpenAI". Для production — только настоящие embeddings.
- `respectRateLimits()` с module-level state — теряется между Worker isolates. Нужен KV/DO для реального rate limiting.
- `searchRepositoryDocumentationNaive()` — возвращает весь документ с комментарием "поиск не дал результата". Это костыль, не реальный поиск.

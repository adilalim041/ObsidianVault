# supabase-js — Backend Deep Dive
**Date:** 2026-04-12
**Repo:** `C:/Users/User/Desktop/_study_tmp/supabase-js/`
**Relevance:** Omoikiri (wa-bridge) — используем Supabase каждый день

---

## Структура монорепозитория

Это NX monorepo. Каждый клиент — отдельный пакет:

```
packages/core/
  supabase-js/     — точка входа, SupabaseClient
  auth-js/         — GoTrueClient (JWT, sessions, auto-refresh)
  postgrest-js/    — PostgrestClient (query builder, filter builder)
  realtime-js/     — RealtimeClient (WebSocket + channels)
  storage-js/      — StorageClient (buckets, files)
  functions-js/    — FunctionsClient (Edge Functions)
```

Зависимости пакетов npm: `@supabase/auth-js`, `@supabase/postgrest-js`, `@supabase/realtime-js`, `@supabase/storage-js`, `@supabase/functions-js`. В `package.json` корневого пакета — только devDependencies (nx, typescript, jest).

---

## Паттерн 1: Сборка SupabaseClient из пяти клиентов

**Файл:** `packages/core/supabase-js/src/SupabaseClient.ts`

SupabaseClient — это тонкий оркестратор. Он не содержит логики — только конструирует пять под-клиентов и пробрасывает методы.

```typescript
// SupabaseClient constructor (упрощено)
constructor(supabaseUrl: string, supabaseKey: string, options?) {
  const baseUrl = validateSupabaseUrl(supabaseUrl)

  // 1. URL-деривация для каждого сервиса
  this.realtimeUrl = new URL('realtime/v1', baseUrl)  // → wss://...
  this.authUrl     = new URL('auth/v1', baseUrl)
  this.storageUrl  = new URL('storage/v1', baseUrl)
  this.functionsUrl = new URL('functions/v1', baseUrl)
  // REST: new URL('rest/v1', baseUrl)

  // 2. fetchWithAuth — все запросы автоматически получают актуальный JWT
  this.fetch = fetchWithAuth(supabaseKey, this._getAccessToken.bind(this), settings.global.fetch)

  // 3. Auth клиент (или Proxy-заглушка если используется accessToken option)
  if (!settings.accessToken) {
    this.auth = this._initSupabaseAuthClient(settings.auth, this.headers, settings.global.fetch)
  } else {
    this.accessToken = settings.accessToken
    this.auth = new Proxy({} as any, {
      get: (_, prop) => { throw new Error(`supabase.auth.${String(prop)} недоступен с accessToken`) }
    })
  }

  // 4. Realtime — получает accessToken callback
  this.realtime = this._initRealtimeClient({
    headers: this.headers,
    accessToken: this._getAccessToken.bind(this),
    ...settings.realtime,
  })

  // 5. PostgREST — использует fetchWithAuth
  this.rest = new PostgrestClient(new URL('rest/v1', baseUrl).href, {
    headers: this.headers,
    schema: settings.db.schema,
    fetch: this.fetch,
    timeout: settings.db.timeout,
  })

  // 6. Storage — тоже через fetchWithAuth
  this.storage = new SupabaseStorageClient(this.storageUrl.href, this.headers, this.fetch)

  // 7. Auth events → sync realtime token
  if (!settings.accessToken) {
    this._listenForAuthEvents()
  }
}
```

**Ключевой инсайт:** `functions` — это getter, а не поле. Новый `FunctionsClient` создаётся при каждом обращении к `supabase.functions`. Это потому что Functions не хранит state.

```typescript
get functions(): FunctionsClient {
  return new FunctionsClient(this.functionsUrl.href, {
    headers: this.headers,
    customFetch: this.fetch,
  })
}
```

**Omoikiri применение:** В wa-bridge мы используем `supabase.from()` и прямой `supabase` клиент. Паттерн показывает — можно передавать свой `fetch` через `global.fetch` для логирования всех запросов. Например, обернуть fetch в Pino-логгер.

---

## Паттерн 2: fetchWithAuth — автоматический JWT во всех запросах

**Файл:** `packages/core/supabase-js/src/lib/fetch.ts`

```typescript
export const fetchWithAuth = (
  supabaseKey: string,
  getAccessToken: () => Promise<string | null>,
  customFetch?: Fetch
): Fetch => {
  const fetch = resolveFetch(customFetch)

  return async (input, init) => {
    // При каждом запросе получаем актуальный токен (может быть auto-refreshed)
    const accessToken = (await getAccessToken()) ?? supabaseKey
    let headers = new Headers(init?.headers)

    // Не перезаписывать если уже установлено
    if (!headers.has('apikey')) {
      headers.set('apikey', supabaseKey)
    }
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }

    return fetch(input, { ...init, headers })
  }
}
```

`_getAccessToken` в SupabaseClient:
```typescript
private async _getAccessToken() {
  if (this.accessToken) {
    return await this.accessToken()   // custom accessToken callback
  }
  const { data } = await this.auth.getSession()
  return data.session?.access_token ?? this.supabaseKey  // fallback на anon key
}
```

**Omoikiri применение:** В wa-bridge используется `service_role` ключ, поэтому `Authorization: Bearer <service_role>` проходит мимо RLS. Это важно: если когда-нибудь захотим добавить RLS — нужно будет передавать пользовательский JWT, а не service_role. Текущий код корректен для серверного использования.

---

## Паттерн 3: JWT Auto-Refresh — как это работает изнутри

**Файл:** `packages/core/auth-js/src/GoTrueClient.ts`

### Константы тайминга

```typescript
// lib/constants.ts
export const AUTO_REFRESH_TICK_DURATION_MS = 30 * 1000   // проверка каждые 30 сек
export const AUTO_REFRESH_TICK_THRESHOLD = 3              // рефреш за 3 тика до истечения
export const EXPIRY_MARGIN_MS = 3 * 30_000 = 90_000      // т.е. за 90 секунд до истечения
export const JWKS_TTL = 10 * 60 * 1000                   // JWKS кеш 10 минут
```

### Auto-refresh ticker

```typescript
private async _startAutoRefresh() {
  // Каждые 30 секунд
  const ticker = setInterval(() => this._autoRefreshTokenTick(), AUTO_REFRESH_TICK_DURATION_MS)
  this.autoRefreshTicker = ticker

  // Node.js specific: unref() чтобы не блокировать завершение процесса
  if (ticker && typeof ticker === 'object' && typeof ticker.unref === 'function') {
    ticker.unref()
  }

  // Немедленный первый тик (но после initialize)
  setTimeout(async () => {
    await this.initializePromise
    await this._autoRefreshTokenTick()
  }, 0)
}

private async _autoRefreshTokenTick() {
  // acquireLock(0) = не ждать, пропустить если заблокировано
  await this._acquireLock(0, async () => {
    const now = Date.now()
    return await this._useSession(async (result) => {
      const { session } = result.data
      if (!session?.refresh_token || !session.expires_at) return

      // Сколько тиков до истечения
      const expiresInTicks = Math.floor(
        (session.expires_at * 1000 - now) / AUTO_REFRESH_TICK_DURATION_MS
      )
      // Рефреш если осталось <= 3 тика (90 секунд)
      if (expiresInTicks <= AUTO_REFRESH_TICK_THRESHOLD) {
        await this._callRefreshToken(session.refresh_token)
      }
    })
  })
}
```

### Защита от параллельных рефрешей (Deferred pattern)

```typescript
private async _callRefreshToken(refreshToken: string) {
  // Если рефреш уже в процессе — вернуть тот же Promise
  if (this.refreshingDeferred) {
    return this.refreshingDeferred.promise  // все ждут одного результата
  }

  try {
    this.refreshingDeferred = new Deferred<CallRefreshTokenResult>()

    const { data, error } = await this._refreshAccessToken(refreshToken)
    if (error) throw error

    await this._saveSession(data.session)
    await this._notifyAllSubscribers('TOKEN_REFRESHED', data.session)

    const result = { data: data.session, error: null }
    this.refreshingDeferred.resolve(result)
    return result
  } catch (error) {
    if (!isAuthRetryableFetchError(error)) {
      await this._removeSession()  // невосстановимая ошибка — удаляем сессию
    }
    this.refreshingDeferred?.resolve({ data: null, error })
    throw error
  } finally {
    this.refreshingDeferred = null
  }
}
```

### Exponential backoff при рефреше

```typescript
private async _refreshAccessToken(refreshToken: string) {
  return await retryable(
    async (attempt) => {
      if (attempt > 0) {
        await sleep(200 * Math.pow(2, attempt - 1)) // 200ms, 400ms, 800ms...
      }
      return await _request(this.fetch, 'POST', `${this.url}/token?grant_type=refresh_token`, {
        body: { refresh_token: refreshToken },
        headers: this.headers,
        xform: _sessionResponse,
      })
    },
    (attempt, error) => {
      const nextBackOff = 200 * Math.pow(2, attempt)
      return (
        error &&
        isAuthRetryableFetchError(error) &&
        // Ретрай только если успеем до следующего тика (30 сек)
        Date.now() + nextBackOff - startedAt < AUTO_REFRESH_TICK_DURATION_MS
      )
    }
  )
}
```

**Omoikiri применение:** В wa-bridge мы используем `service_role` ключ — у него нет истечения сессии в смысле Auth JWT. Но когда используем `supabase.auth.setSession()` для сохранения Baileys-состояния (неправильно!) или управляем пользователями дашборда — auto-refresh работает. Для серверного Node.js важно что ticker вызывает `.unref()` — процесс не заблокируется.

---

## Паттерн 4: Locking — Navigator API + ProcessLock для Node.js

**Файл:** `packages/core/auth-js/src/lib/locks.ts`

GoTrueClient использует два вида локов в зависимости от среды:

```typescript
// Выбор лока в конструкторе:
if (settings.lock) {
  this.lock = settings.lock  // кастомный
} else if (this.persistSession && isBrowser() && globalThis?.navigator?.locks) {
  this.lock = navigatorLock  // браузер: Web Locks API
} else {
  this.lock = lockNoOp       // Node.js без persistSession: нет лока
}
```

`processLock` для Node.js/React Native (одиночный процесс):
```typescript
const PROCESS_LOCKS: { [name: string]: Promise<any> } = {}

export async function processLock<R>(name, acquireTimeout, fn): Promise<R> {
  // Очередь через Promise chaining
  const previousOperation = PROCESS_LOCKS[name] ?? Promise.resolve()

  const currentOperation = (async () => {
    // Ждём предыдущую операцию (с таймаутом)
    await Promise.race([previousOperation, timeoutPromise])
    return await fn()
  })()

  // Регистрируем текущую как "последнюю" для следующих
  PROCESS_LOCKS[name] = currentOperation.catch(() => {})

  return await currentOperation
}
```

`navigatorLock` для браузера имеет логику кражи лока (`steal: true`) при таймауте — защита от React Strict Mode orphaned locks.

**Omoikiri применение:** wa-bridge работает в Node.js на Railway. Если нам понадобится кастомный лок (например, для мультиинстансной защиты), можно передать в `auth.lock`. Но для текущей single-instance Railway установки lockNoOp (дефолт для серверного Node.js) — правильный выбор.

---

## Паттерн 5: PostgrestBuilder — lazy execution через PromiseLike

**Файл:** `packages/core/postgrest-js/src/PostgrestBuilder.ts`

Цепочки запросов (`from().select().eq().limit()`) ничего не выполняют пока не `await`.

```typescript
abstract class PostgrestBuilder<ClientOptions, Result, ThrowOnError>
  implements PromiseLike<...>
{
  // Все методы (.eq, .select, .limit) просто мутируют this.url и this.headers

  // Выполнение происходит только в .then()
  then(onfulfilled?, onrejected?) {
    // Финализируем заголовки
    if (['GET', 'HEAD'].includes(this.method)) {
      this.headers.set('Accept-Profile', this.schema)
    } else {
      this.headers.set('Content-Profile', this.schema)
    }

    // Retry логика встроена в builder
    const executeWithRetry = async () => {
      let attemptCount = 0
      while (true) {
        let res: Response
        try {
          res = await _fetch(this.url.toString(), {
            method: this.method,
            headers: new Headers(this.headers),
            body: JSON.stringify(this.body),
            signal: this.signal,
          })
        } catch (fetchError) {
          if (fetchError?.name === 'AbortError') throw fetchError
          // Retry только GET/HEAD/OPTIONS
          if (this.retryEnabled && RETRYABLE_METHODS.includes(this.method) && attemptCount < 3) {
            await sleep(getRetryDelay(attemptCount))
            attemptCount++
            continue
          }
          throw fetchError
        }

        // HTTP retry: 503 (PostgREST schema cache), 520 (Cloudflare)
        if (shouldRetry(this.method, res.status, attemptCount, this.retryEnabled)) {
          await sleep(getRetryDelay(attemptCount))
          attemptCount++
          continue
        }

        return await this.processResponse(res)
      }
    }

    return executeWithRetry().then(onfulfilled, onrejected)
  }
}
```

### maybeSingle() реализация

```typescript
// В processResponse:
if (this.isMaybeSingle && Array.isArray(data)) {
  if (data.length > 1) {
    error = { code: 'PGRST116', message: 'JSON object requested, multiple rows returned' }
    data = null
    status = 406
  } else if (data.length === 1) {
    data = data[0]  // достаём объект
  } else {
    data = null     // 0 строк — возвращаем null БЕЗ ошибки
  }
}
```

Это объясняет из наших learnings: `maybeSingle()` возвращает `null` когда строк нет, а `.single()` — ошибку.

### Встроенный retry

```typescript
// Retryable статус-коды:
export const RETRYABLE_STATUS_CODES = [520, 503] as const
// 503 = PostgREST cache не загружен (временно), 520 = Cloudflare timeout

// Exponential backoff:
export const getRetryDelay = (attemptIndex: number): number =>
  Math.min(1000 * 2 ** attemptIndex, 30000)  // 1s, 2s, 4s, 8s... max 30s

// Отключить для конкретного запроса:
await supabase.from('messages').select().retry(false)
```

**Omoikiri применение:** В wa-bridge при записи сообщений через `supabase.from('messages').insert(...)` retry не применяется (только GET). Для критических операций типа записи `auth_state` стоит добавить свой retry через p-retry. Встроенный retry работает только для SELECT.

---

## Паттерн 6: Realtime — WebSocket reconnect и channel subscriptions

**Файл:** `packages/core/realtime-js/src/RealtimeClient.ts`

### Reconnect intervals

```typescript
const RECONNECT_INTERVALS = [1000, 2000, 5000, 10000] as const
const DEFAULT_RECONNECT_FALLBACK = 10000

// Паттерн из socketAdapter (Phoenix protocol):
// tries=1 → 1s, tries=2 → 2s, tries=3 → 5s, tries=4+ → 10s
```

### Деduplication каналов

```typescript
channel(topic: string, params = { config: {} }): RealtimeChannel {
  const realtimeTopic = `realtime:${topic}`
  const exists = this.getChannels().find((c) => c.topic === realtimeTopic)

  if (!exists) {
    const chan = new RealtimeChannel(`realtime:${topic}`, params, this)
    this.channels.push(chan)
    return chan
  } else {
    return exists  // возвращает существующий, не создаёт дубль
  }
}
```

### Token propagation на каналы

```typescript
private async _performAuth(token: string | null = null) {
  // ...resolve token...

  if (this.accessTokenValue != tokenToSend) {
    this.accessTokenValue = tokenToSend

    // Обновляем токен во ВСЕХ активных каналах
    this.channels.forEach((channel) => {
      tokenToSend && channel.updateJoinPayload({ access_token: tokenToSend })

      // Если канал уже подписан — отправляем новый токен
      if (channel.joinedOnce && channel.channelAdapter.isJoined()) {
        channel.channelAdapter.push(CHANNEL_EVENTS.access_token, {
          access_token: tokenToSend,
        })
      }
    })
  }
}
```

### Автозапуск connect при subscribe()

```typescript
subscribe(callback?, timeout?) {
  // Не нужно вручную вызывать connect()!
  if (!this.socket.isConnected()) {
    this.socket.connect()  // auto-connect
  }
  // ...
}
```

### Worker для heartbeat (браузер + фоновые вкладки)

```typescript
// RealtimeClient поддерживает Web Worker для heartbeat
// чтобы соединение не умирало когда вкладка в фоне
const WORKER_SCRIPT = `
  addEventListener("message", (e) => {
    if (e.data.event === "start") {
      setInterval(() => postMessage({ event: "keepAlive" }), e.data.interval);
    }
  });`

// Включить: createClient(url, key, { realtime: { worker: true } })
```

**Omoikiri применение:** wa-bridge НЕ использует Realtime (dashboard подключается напрямую к Supabase). Но если бы нам захотелось добавить real-time push от wa-bridge к дашборду — правильный паттерн:

```typescript
// Правильно: один канал per session
const channel = supabase.channel(`session:${sessionId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `session_id=eq.${sessionId}`
  }, (payload) => handleNewMessage(payload))
  .subscribe()

// Cleanup при shutdown
await supabase.removeChannel(channel)
```

---

## Паттерн 7: Типизация из Database schema

**Файл:** `packages/core/supabase-js/src/SupabaseClient.ts` (generic parameters)

```typescript
// Генерация типов: supabase gen types typescript --project-id <ref>
// Результат: Database interface

export type Database = {
  __InternalSupabase: { PostgrestVersion: '12' }  // версия PostgREST
  public: {
    Tables: {
      messages: {
        Row: { id: number; body: string; session_id: string; ... }
        Insert: { body: string; session_id: string; ... }
        Update: { body?: string; ... }
        Relationships: [{ foreignKeyName: "messages_session_id_fkey"; ... }]
      }
    }
    Views: { ... }
    Functions: { ... }
  }
}

// Использование:
const supabase = createClient<Database>(url, key)

// Теперь всё типизировано:
const { data } = await supabase
  .from('messages')     // TS проверяет название таблицы
  .select('id, body')   // TS парсит строку и выводит тип { id: number; body: string }[]
  .eq('session_id', id) // TS проверяет тип колонки (string)
```

### select-query-parser — TypeScript AST для строк

Внутри `packages/core/postgrest-js/src/select-query-parser/` живёт полноценный TypeScript type-level парсер строк select.

```typescript
// Магия типов: парсинг строки select в compile time
type GetResult<Schema, Row, RelationName, Relationships, Query, ClientOptions> = ...

// Пример: '.select('id, name, messages(body)')' 
// возвращает тип: { id: number; name: string; messages: { body: string }[] }[]
```

### overrideTypes() для escape hatch

```typescript
// Когда типы сгенерированы неправильно или есть JSONB поле
const { data } = await supabase
  .from('chat_ai')
  .select('consultation_details')
  .overrideTypes<{ consultation_details: ConsultationDetails }, { merge: false }>()
  // Полная замена типа результата
```

**Omoikiri применение:** wa-bridge пишет на JS, не TS — типизация недоступна. Но дашборд (React, TS) мог бы использовать генерацию типов. Если захотим добавить типизацию в wa-bridge — достаточно:
1. `supabase gen types typescript --project-id <ref> > src/types/supabase.ts`
2. `createClient<Database>(url, key)` в инициализации

---

## Паттерн 8: Auth token синхронизация Realtime

**Файл:** `packages/core/supabase-js/src/SupabaseClient.ts`

```typescript
private _listenForAuthEvents() {
  const data = this.auth.onAuthStateChange((event, session) => {
    this._handleTokenChanged(event, 'CLIENT', session?.access_token)
  })
  return data
}

private _handleTokenChanged(event, source, token?) {
  if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') &&
      this.changedAccessToken !== token) {
    this.changedAccessToken = token
    this.realtime.setAuth(token)  // новый JWT → все каналы обновляются
  } else if (event === 'SIGNED_OUT') {
    this.realtime.setAuth()       // без токена — используется anon key
    if (source === 'STORAGE') this.auth.signOut()
    this.changedAccessToken = undefined
  }
}
```

Когда auth делает TOKEN_REFRESHED → realtime автоматически обновляет JWT во всех каналах. Это прозрачно для пользователя SDK.

---

## Паттерн 9: accessToken option — third-party auth

**Файл:** `packages/core/supabase-js/src/lib/types.ts`

```typescript
// Альтернатива встроенному Auth — свой JWT провайдер
const supabase = createClient(url, key, {
  accessToken: async () => {
    // Ваш Auth0, Clerk, Firebase Auth, etc.
    return await myAuthProvider.getToken()
  }
})

// При accessToken: supabase.auth недоступен (Proxy с ошибкой)
// Зато все запросы (REST, Realtime) получают ваш токен
```

Инициализация Realtime при accessToken:
```typescript
// Немедленно ставим токен чтобы избежать race condition с channel subscriptions
Promise.resolve(this.accessToken())
  .then((token) => this.realtime.setAuth(token))
  .catch((e) => console.warn('Failed to set initial Realtime auth token:', e))
```

**Omoikiri применение:** Не актуально сейчас. Но если в будущем появится другой Auth провайдер для дашборда — это правильный путь.

---

## Паттерн 10: BroadcastChannel для синхронизации вкладок

**Файл:** `packages/core/auth-js/src/GoTrueClient.ts`

```typescript
// В браузере — синхронизация сессии между вкладками
if (isBrowser() && globalThis.BroadcastChannel && this.persistSession) {
  this.broadcastChannel = new BroadcastChannel(this.storageKey)

  this.broadcastChannel.addEventListener('message', async (event) => {
    // Вкладка 2 обновила токен → вкладка 1 тоже получает обновление
    await this._notifyAllSubscribers(event.data.event, event.data.session, false)
    //                                                                       ^ false = не рассылать обратно
  })
}

// При TOKEN_REFRESHED — рассылаем всем вкладкам
private async _notifyAllSubscribers(event, session, broadcast = true) {
  if (this.broadcastChannel && broadcast) {
    this.broadcastChannel.postMessage({ event, session })
  }
  // + вызываем все локальные onAuthStateChange коллбэки
}
```

**Omoikiri применение:** wa-bridge — серверный Node.js, BroadcastChannel недоступен. Но дашборд (React/Vercel) работает в браузере — там это работает автоматически. Менеджеры с разными вкладками дашборда получат синхронные сессии.

---

## Паттерн 11: GLOBAL_JWKS кеш для asymmetric JWT

```typescript
// Общий кеш JWKS для всех инстанций клиента с одним storageKey
const GLOBAL_JWKS: {
  [storageKey: string]: { cachedAt: number; jwks: { keys: JWK[] } }
} = {}

// TTL: 10 минут (JWKS_TTL = 10 * 60 * 1000)
// Особенно полезно в serverless: Lambda/Vercel/Edge Functions
// где много инстанций клиента создаётся одновременно
```

Это важно для серверных окружений с asymmetric JWT (RS256/ES256). Supabase по умолчанию использует HS256 (symmetric), но при переходе на асимметричные — JWKS не будет запрашиваться при каждом createClient().

---

## Паттерн 12: URL длина и защита от oversized queries

```typescript
// В PostgrestBuilder
this.urlLengthLimit = builder.urlLengthLimit ?? 8000

// При AbortError с длинным URL:
if (fetchError?.name === 'AbortError') {
  if (urlLength > this.urlLengthLimit) {
    hint = `Your request URL is ${urlLength} characters. ` +
           `If filtering with large arrays (.in('id', [many IDs])), ` +
           `consider using an RPC function to pass values server-side.`
  }
}
```

**Omoikiri применение:** В wa-bridge при анализе диалогов мы можем делать `.in('dialog_session_id', largeArray)`. Если массив большой (>200 ID) — запрос может упасть с timeout. Рекомендация: использовать `.rpc('get_dialogs_for_analysis', { ids: [...] })` вместо `.in()` для больших массивов.

---

## Паттерн 13: throwOnError mode

```typescript
// Два режима работы SDK:

// Режим 1 (дефолт): ошибка в data
const { data, error } = await supabase.from('table').select()
if (error) handleError(error)

// Режим 2: throwOnError — throw вместо return
const supabase = createClient(url, key, {
  auth: { throwOnError: true }
})
// или per-query:
const { data } = await supabase.from('table').select().throwOnError()
// Теперь нужен try/catch

// Также для Auth:
this._returnResult(result) {
  if (this.throwOnError && result.error) throw result.error
  return result
}
```

**Omoikiri применение:** В wa-bridge лучше оставить дефолтный режим (без throw) — он более предсказуем для серверного кода с explicit error handling через Zod (из gotchas: JSON parsing был fragile, исправлен Zod схемами).

---

## Итоговая карта — что можно улучшить в Omoikiri (wa-bridge)

### 1. Типизация (высокий приоритет, низкая сложность)
```bash
supabase gen types typescript --project-id <ref> > src/types/supabase.ts
```
Добавить `createClient<Database>(url, key)`. Даст автодополнение и защиту от опечаток в именах таблиц/колонок. Сейчас в wa-bridge JS — но можно добавить JSDoc с `@typedef`.

### 2. Retry для INSERT/UPSERT (средний приоритет)
Встроенный retry работает только для GET. Критические операции — запись `auth_state`, запись `messages` — не имеют retry. Добавить p-retry вокруг Supabase insert/upsert операций для `auth_state` и `session_lock`.

### 3. URL-length guard для .in() queries (низкий приоритет)
Если делаем `.in('dialog_session_id', ids)` с большим массивом — безопасный лимит ~200 ID. Для большего — переходить на `.rpc()`. Добавить assert/warn в dailyAnalysis если массив IDs > 150.

### 4. Явный cleanup каналов при shutdown (N/A сейчас)
Если добавим Realtime в wa-bridge — обязательно вызывать `supabase.removeAllChannels()` в graceful shutdown handler. Иначе Supabase Realtime сервер будет держать соединения 30 секунд после смерти процесса.

### 5. Custom fetch для observability (опционально)
```javascript
const supabase = createClient(url, key, {
  global: {
    fetch: async (input, init) => {
      const start = Date.now()
      const response = await fetch(input, init)
      logger.info({ url: input, duration: Date.now() - start, status: response.status }, 'supabase-request')
      return response
    }
  }
})
```

---

## Новые learnings из этого study

1. `maybeSingle()` работает client-side: PostgREST возвращает массив, SDK преобразует в объект/null в `processResponse()` — ноль сетевых overhead по сравнению с `.single()`

2. Auto-refresh ticker вызывает `.unref()` в Node.js — процесс не зависнет из-за setInterval при тестировании

3. Встроенный retry в PostgrestBuilder работает ТОЛЬКО для GET/HEAD/OPTIONS (idempotent) — для INSERT/UPDATE нужен внешний retry

4. Realtime channel.subscribe() автоматически вызывает connect() если WebSocket не открыт

5. При `accessToken` option (third-party auth) `supabase.auth` полностью заблокирован через Proxy — это intentional

6. GLOBAL_JWKS кеш шарится между всеми createClient() с одним storageKey — критично для serverless с asymmetric JWT

7. BroadcastChannel используется для sync сессии между вкладками браузера — работает автоматически без конфигурации

8. `functions` getter создаёт новый FunctionsClient при каждом вызове — это нормально, он stateless

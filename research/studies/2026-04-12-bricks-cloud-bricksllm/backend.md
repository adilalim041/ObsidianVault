# BricksLLM — Backend Deep Dive

**Date:** 2026-04-12
**Repo:** `C:/Users/User/Desktop/_study_tmp/bricksllm/`
**Language:** Go
**Relevance:** LLM gateway, multi-provider failover — directly applicable to News.AI multi-LLM pipeline (OpenAI + Gemini + future providers)

---

## Architecture Overview

BricksLLM is a production LLM API gateway written in Go. It sits between clients and LLM providers (OpenAI, Azure OpenAI, Anthropic, vLLM, Bedrock, DeepInfra), handling:

- Authentication via virtual API keys
- Multi-provider failover routing with per-step retries
- Rate limiting (per-key, per-user, per time unit)
- Cost tracking in microdollars
- PII scanning and redaction
- Response caching keyed by request hash
- Async event recording via in-process message bus

The two servers: `proxy` (port 8002 — client-facing) and `admin` (port 8001 — management). All config (routes, keys, provider settings) is stored in PostgreSQL, hot-reloaded into in-memory maps via a polling MemDb layer.

```
Client → ProxyServer (Gin)
             ↓
    [timeout middleware]
    [auth + policy middleware]  ← MemDb (routes, policies, keys)
             ↓
    [route handler OR provider handler]
             ↓
    Route.RunStepsV2() — ordered step list with per-step retries
             ↓
    Provider A → retry → Provider B → retry → Provider C
             ↓
    MessageBus.Publish("event") → async Handler → RecordEvent / RecordKeySpend
```

---

## Pattern 1: Ordered Failover Steps with Backoff

**File:** `internal/route/route.go`

The core failover engine. A `Route` is a named path with an ordered list of `Step`s. Each step targets one provider with its own retry count, timeout, and model override. Steps execute sequentially — only moving to the next step when the current one exhausts all retries.

```go
// Route definition — stored in PostgreSQL, loaded into MemDb
type Route struct {
    Id            string       `json:"id"`
    RetryStrategy string       `json:"retryStrategy"` // "exponential" or constant
    Steps         []*Step      `json:"steps"`
    CacheConfig   *CacheConfig `json:"cacheConfig"`
}

type Step struct {
    Retries       int               `json:"retries"`
    RetryInterval string            `json:"retryInterval"` // Go duration string "1s", "500ms"
    Provider      string            `json:"provider"`      // "openai", "azure", "anthropic"
    RequestParams map[string]any    `json:"requestParams"` // override temperature, max_tokens etc.
    Params        map[string]string `json:"params"`        // provider-specific: deploymentId, apiVersion
    Model         string            `json:"model"`         // model override per step
    Timeout       string            `json:"timeout"`       // per-step timeout
}

func InitializeBackoff(strategy string, dur time.Duration) backoff.BackOff {
    if strategy == "exponential" {
        b := backoff.NewExponentialBackOff()
        return b
    }
    return backoff.NewConstantBackOff(dur)
}

func (r *Route) RunStepsV2(req *Request, rec recorder, log *zap.Logger, kc *key.ResponseKey) (*Response, error) {
    body, _ := io.ReadAll(req.Forwarded.Body)
    events := []*event.Event{}
    response := &Response{}

    for _, step := range r.Steps {
        dur := time.Second
        if len(step.RetryInterval) != 0 {
            parsed, _ := time.ParseDuration(step.RetryInterval)
            dur = parsed
        }

        b := InitializeBackoff(r.RetryStrategy, dur)
        withRetries := backoff.WithMaxRetries(b, uint64(step.Retries))

        do := func() error {
            // build event for this attempt
            evt := &event.Event{...}
            events = append(events, evt)

            // per-step timeout via context
            parsed, _ := time.ParseDuration(step.Timeout)
            ctx, cancel := context.WithTimeout(context.Background(), parsed)

            // mutate request body: inject step.Model, override requestParams
            bs, _ := step.DecorateRequest(step.Provider, body, r.ShouldRunEmbeddings())

            hreq, _ := req.createHttpRequest(ctx, step.Provider, r.ShouldRunEmbeddings(), step.Params, bs)
            res, err := req.Client.Do(hreq)
            if err != nil {
                return err // triggers retry
            }

            if res.StatusCode != http.StatusOK {
                return errors.New("response is not okay") // triggers retry
            }

            // success — keep cancel alive for streaming
            shouldNotCancel = true
            return nil
        }

        notify := func(err error, t time.Duration) {
            log.Debug("error when requesting external api via route", zap.Error(err), zap.Duration("duration", t))
        }

        err := backoff.RetryNotify(do, withRetries, notify)
        if err == nil {
            break // success — stop iterating steps
        }
        // err != nil — all retries for this step exhausted → move to next step
    }

    // record all failed attempt events asynchronously, skip the last
    for idx, evt := range events {
        if idx != len(events)-1 {
            go rec.RecordEvent(evt)
        }
    }

    if response.Response != nil {
        return response, nil
    }
    return nil, errors.New("no responses")
}
```

**Key insight:** Each step is an independent backoff context. Step N's exhaustion causes step N+1 to begin — not a global retry counter. The library used is `github.com/cenkalti/backoff/v4`.

**News.AI application:** Brain could use this pattern directly. Define steps: `[{provider: "openai", model: "gpt-4o-mini", retries: 2}, {provider: "anthropic", model: "claude-haiku", retries: 1}]`. When OpenAI 429s, Anthropic kicks in automatically.

---

## Pattern 2: Request Decoration — Per-Step Model and Param Override

**File:** `internal/route/route.go` — `Step.DecorateRequest()` and `DecorateChatCompletionRequest()`

Before sending to each provider, the request body is transformed: the model field is replaced with the step's model, and `requestParams` (temperature, max_tokens, etc.) are overridden. This means the client sends one generic request and each failover step can target a completely different model with different parameters.

```go
func (s *Step) DecorateRequest(provider string, body []byte, isEmbedding bool) ([]byte, error) {
    if !isEmbedding {
        completionReq := &goopenai.ChatCompletionRequest{}
        json.Unmarshal(body, completionReq)

        completionReq.Model = s.Model
        s.DecorateChatCompletionRequest(completionReq) // apply requestParams overrides

        return json.Marshal(completionReq)
    }
    return body, nil
}

func (s *Step) DecorateChatCompletionRequest(req *goopenai.ChatCompletionRequest) {
    req.Model = s.Model

    if val, ok := s.RequestParams["temperature"]; ok {
        if parsed, ok := val.(float64); ok {
            req.Temperature = float32(parsed)
        }
    }
    if val, ok := s.RequestParams["max_tokens"]; ok {
        if parsed, ok := val.(float64); ok {
            req.MaxTokens = int(parsed)
        }
    }
    if val, ok := s.RequestParams["frequency_penalty"]; ok { ... }
    if val, ok := s.RequestParams["top_p"]; ok { ... }
    // ... seed, logit_bias, logprobs, stop, n
}
```

**Auth header rewriting per provider** happens in `createHttpRequest()`:

```go
func (r *Request) createHttpRequest(ctx context.Context, provider string, ...) (*http.Request, error) {
    key, _ := r.GetSettingValue(provider, "apikey")
    url := buildRequestUrl(provider, runEmbeddings, resourceName, params)

    hreq, _ := http.NewRequestWithContext(ctx, r.Forwarded.Method, url, io.NopCloser(bytes.NewReader(data)))

    // provider-specific auth header
    if provider == "azure" {
        hreq.Header.Set("api-key", key)
    } else {
        hreq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", key))
    }

    // copy original headers, STRIPPING auth (prevents key leakage)
    for k := range r.Forwarded.Header {
        if strings.HasPrefix(strings.ToLower(k), "authorization") { continue }
        if strings.HasPrefix(strings.ToLower(k), "api-key") { continue }
        if strings.ToLower(k) == "accept-encoding" { continue }
        hreq.Header.Set(k, r.Forwarded.Header.Get(k))
    }

    return hreq, err
}
```

**Key insight:** Strip the client's auth header before forwarding. Inject the real provider API key from your internal settings. This is the essential security boundary of any LLM gateway.

**News.AI application:** Brain's `callOpenAI()` and `callGemini()` functions currently duplicate this auth-header-swap logic. A unified `decorateRequest(provider, body, model)` helper would centralize it.

---

## Pattern 3: Virtual API Key + Two-Layer Caching for Auth

**File:** `internal/authenticator/authenticator.go`, `internal/storage/redis/key-cache.go`

Authentication uses a virtual API key system. Clients send a "bricks key" that maps to one or more provider settings (real API keys). The auth layer has two caches: a Redis cache with TTL and a fallback to PostgreSQL storage.

```go
func (a *Authenticator) AuthenticateHttpRequest(req *http.Request) (*key.ResponseKey, []*provider.Setting, error) {
    // 1. extract key from multiple header locations
    raw, err := getApiKey(req) // checks x-api-key, api-key, Authorization Bearer

    // 2. hash it — never store raw keys in memory
    hash := hasher.Hash(raw)

    // 3. cache lookup: try hash first, then raw (for non-hashed keys)
    key, err := a.kc.GetKeyViaCache(hash)
    if key == nil {
        key, err = a.kc.GetKeyViaCache(raw)
    }

    // 4. load provider settings for this key
    settingIds := key.GetSettingIds() // supports both settingId and settingIds[]
    for _, settingId := range settingIds {
        setting, _ := a.psm.GetSettingViaCache(settingId)
        if canAccessPath(setting.Provider, req.URL.Path) {
            selected = append(selected, setting)
        }
    }

    // 5. key rotation — random selection across multiple settings
    if key.RotationEnabled {
        used = selected[rand.Intn(len(selected))]
    } else {
        used = selected[0]
    }

    // 6. decrypt provider API key if encryption enabled
    if a.decryptor.Enabled() {
        decryptedSecret, err := a.decryptor.Decrypt(encryptedParam, map[string]string{
            "X-UPDATED-AT": strconv.FormatInt(used.UpdatedAt, 10),
        })
        used.Setting["apikey"] = decryptedSecret
    }

    // 7. rewrite the request's auth header to the provider's real key
    rewriteHttpAuthHeader(req, used)

    return key, selected, nil
}

// Multi-header extraction — order matters: x-api-key > api-key > Bearer
func getApiKey(req *http.Request) (string, error) {
    list := []string{
        req.Header.Get("x-api-key"),
        req.Header.Get("api-key"),
    }
    split := strings.Split(req.Header.Get("Authorization"), " ")
    if len(split) >= 2 {
        list = append(list, split[1])
    }
    for _, key := range list {
        if len(key) != 0 {
            return key, nil
        }
    }
    return "", internal_errors.NewAuthError("api key not found in header")
}
```

The `ResponseKey` struct combines rate limiting, cost limiting, TTL, and path access controls in one object:

```go
type ResponseKey struct {
    KeyId                  string       `json:"keyId"`
    Revoked                bool         `json:"revoked"`
    RevokedReason          string       `json:"revokedReason"`
    CostLimitInUsd         float64      `json:"costLimitInUsd"`         // absolute lifetime limit
    CostLimitInUsdOverTime float64      `json:"costLimitInUsdOverTime"` // rolling window limit
    CostLimitInUsdUnit     TimeUnit     `json:"costLimitInUsdUnit"`     // h/m/s/d/mo
    RateLimitOverTime      int          `json:"rateLimitOverTime"`      // N requests per window
    RateLimitUnit          TimeUnit     `json:"rateLimitUnit"`
    Ttl                    string       `json:"ttl"`                    // key expiry as Go duration
    SettingIds             []string     `json:"settingIds"`             // maps to provider credentials
    AllowedPaths           []PathConfig `json:"allowedPaths"`           // path-level ACL
    ShouldLogRequest       bool         `json:"shouldLogRequest"`
    ShouldLogResponse      bool         `json:"shouldLogResponse"`
    RotationEnabled        bool         `json:"rotationEnabled"`        // random key rotation
    PolicyId               string       `json:"policyId"`               // PII policy
}
```

**News.AI application:** The `api_keys` table in Brain's Supabase already stores per-service keys. This pattern formalizes it: one virtual key per downstream consumer (generator, publisher), mapped to real provider credentials in `provider_settings` table. Rotation for OpenAI rate limit distribution across multiple org keys.

---

## Pattern 4: Sliding Window Rate Limiting with Redis HIncrBy

**File:** `internal/storage/redis/cache.go`, `internal/validator/validator.go`

Rate limiting uses Redis HIncrBy with time-bucketed hash fields. Each time unit gets a different bucketing strategy — second-level counters use millisecond timestamps, minute-level use Unix seconds, etc. The TTL is set to the end of the current window using `ExpireAt`.

```go
func (c *Cache) IncrementCounter(keyId string, timeUnit key.TimeUnit, incr int64) error {
    ctxTimeout, cancel := context.WithTimeout(context.Background(), c.wt)
    defer cancel()

    // ts varies by time unit — this IS the bucket key within the hash
    ts, _ := getCounterTimeStamp(timeUnit)

    // HSET keyId timestamp incr — multiple fields per hash for sub-window granularity
    c.client.HIncrBy(ctxTimeout, keyId, strconv.FormatInt(ts, 10), incr)

    // set TTL only if not already set (val < 0 means no TTL)
    dur := c.client.TTL(ctxTimeout, keyId)
    if dur.Val() < 0 {
        ttl, _ := getCounterTtl(timeUnit)
        c.client.ExpireAt(ctxTimeout, keyId, ttl) // expiry = end of current window
    }
    return nil
}

func getCounterTimeStamp(rateLimitUnit key.TimeUnit) (int64, error) {
    now := time.Now().UTC()
    switch rateLimitUnit {
    case key.SecondTimeUnit:
        return now.UnixMilli() * 10, nil  // 10ms buckets within a second
    case key.MinuteTimeUnit:
        return now.Unix(), nil             // 1s buckets within a minute
    case key.HourTimeUnit:
        return int64(now.Minute()), nil    // 1-minute buckets within an hour
    case key.DayTimeUnit:
        return int64(now.Hour()), nil      // 1-hour buckets within a day
    case key.MonthTimeUnit:
        return int64(now.Day()), nil       // 1-day buckets within a month
    }
}

func getCounterTtl(rateLimitUnit key.TimeUnit) (time.Time, error) {
    now := time.Now().UTC()
    switch rateLimitUnit {
    case key.MonthTimeUnit:
        // first day of next month minus 1ms
        return time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, time.UTC).Add(-time.Millisecond), nil
    case key.DayTimeUnit:
        return now.Truncate(24*time.Hour).Add(time.Hour*24).Add(-time.Millisecond), nil
    // ... etc
    }
}

// Validation reads the counter and compares to limit
func (v *Validator) Validate(k *key.ResponseKey, promptCost float64) error {
    // 1. TTL expiry check
    parsed, _ := time.ParseDuration(k.Ttl)
    if !v.validateTtl(k.CreatedAt, parsed) {
        return internal_errors.NewExpirationError("api key expired", internal_errors.TtlExpiration)
    }

    // 2. rate limit check (requests per window)
    if err := v.validateRateLimitOverTime(k.KeyId, k.RateLimitOverTime, k.RateLimitUnit); err != nil {
        return err
    }

    // 3. cost limit over rolling window
    if err := v.validateCostLimitOverTime(k.KeyId, k.CostLimitInUsdOverTime, k.CostLimitInUsdUnit); err != nil {
        return err
    }

    // 4. absolute lifetime cost limit
    if err := v.validateCostLimit(k.KeyId, k.CostLimitInUsd); err != nil {
        return err
    }

    return nil
}

// Cost stored as microdollars to avoid float precision issues
func convertDollarToMicroDollars(dollar float64) int64 {
    return int64(dollar * 1000000)
}
```

**Key insight:** Using Redis Hash (HIncrBy) instead of a simple string counter allows sub-window granularity — you can see exactly how many requests happened in each second of a minute window. Reading back is `HVals()` which returns all field values, then sum them.

**News.AI application:** Could replace the current per-niche rate limiting done via p-queue concurrency limits. Redis-based rate limiting would survive restarts and work across multiple Brain instances if scaled horizontally.

---

## Pattern 5: In-Process Message Bus for Async Event Recording

**File:** `internal/message/bus.go`, `internal/message/handler.go`, `internal/message/consumer.go`

Instead of writing events synchronously in the request path, BricksLLM uses an internal pub/sub bus. The proxy middleware publishes an `EventWithRequestAndContent` to a channel after the response is sent. A separate goroutine (consumer) reads from that channel, validates the key, estimates costs, increments spend counters, and records the event to PostgreSQL.

```go
// MessageBus — zero external dependencies, pure Go channels
type MessageBus struct {
    Subscribers map[string][]chan<- Message
}

func (mb *MessageBus) Subscribe(messageType string, subscriber chan<- Message) {
    mb.Subscribers[messageType] = append(mb.Subscribers[messageType], subscriber)
}

func (mb *MessageBus) Publish(ms Message) {
    subscribers := mb.Subscribers[ms.Type]
    for _, subscriber := range subscribers {
        subscriber <- ms // blocking send to buffered channel
    }
}

// In proxy middleware — after response is written, defer publishes event
defer func() {
    // ... build evt with cost, tokens, latency, provider, model ...
    enrichedEvent.Event = evt
    pub.Publish(message.Message{
        Type: "event",
        Data: enrichedEvent,
    })
}()
```

The `Handler` (consumer side) receives messages and performs post-request work:
- validates the key is still valid (not revoked in the meantime)
- estimates actual cost from token counts
- calls `recorder.RecordKeySpend()` → increments Redis cost counter + PostgreSQL total spend
- calls `recorder.RecordEvent()` → inserts full event row for analytics

**Key insight:** This decouples the hot path (proxy latency) from the cold path (database writes). The client gets a response as soon as the LLM responds. The event is written asynchronously. If the bus channel is buffered, the proxy never blocks on DB writes.

**News.AI application:** Brain's current pattern logs to Pino synchronously. Moving cost tracking and detailed event logging to an async message handler would reduce latency on the `/generate` and `/publish` endpoints. The buffered channel acts as a lightweight queue — simpler than pg-boss for this use case.

---

## Pattern 6: MemDb — Polling-Based Hot Reload Without Restart

**File:** `internal/storage/memdb/route.go`

Routes and policies are loaded from PostgreSQL into in-memory maps at startup. A background goroutine polls for updates every N seconds using `GetUpdatedRoutes(lastUpdated int64)` — a query that filters by `updated_at > lastUpdated`. Only changed records are applied, reducing DB load.

```go
type RoutesMemDb struct {
    external    RoutesStorage
    ps          PoliciesStorage
    lastUpdated int64
    pathToRoute map[string]*route.Route   // O(1) lookup by path
    idToPolicy  map[string]*policy.Policy
    lock        sync.RWMutex
    done        chan bool
    interval    time.Duration
}

func (mdb *RoutesMemDb) Listen() {
    ticker := time.NewTicker(mdb.interval)

    go func() {
        lastUpdated := mdb.lastUpdated

        for {
            select {
            case <-mdb.done:
                return
            case <-ticker.C:
                routes, err := mdb.external.GetUpdatedRoutes(lastUpdated)
                if err != nil { continue }

                for _, r := range routes {
                    if r.UpdatedAt > lastUpdated {
                        lastUpdated = r.UpdatedAt
                    }

                    existing := mdb.GetRoute(r.Path)
                    if existing == nil || r.UpdatedAt > existing.UpdatedAt {
                        mdb.SetRoute(r) // update in place
                    }
                }
            }
        }
    }()
}
```

**Key insight:** The `GetUpdatedRoutes(updatedAt int64)` pattern requires only a single index on `updated_at` in PostgreSQL. No change-data-capture, no webhooks. The trade-off is eventual consistency up to the polling interval (configurable).

**News.AI application:** Brain's playbook cache currently re-fetches from Supabase on each request. This MemDb pattern would cache playbooks, niches, and channel profiles in memory, refreshing only changed rows. At News.AI's scale (small number of playbooks), even a 30-second poll interval would be fine.

---

## Pattern 7: Per-Request Response Caching via Body Hash

**File:** `internal/server/web/proxy/route.go`, `internal/cache/cache.go`

When a route has `cacheConfig.enabled: true`, the middleware computes a cache key from the request body hash. On hit, the cached bytes are returned immediately. On miss, the response is stored with the configured TTL.

```go
// Cache wraps Redis, keys are SHA256 hashes of the value
func (c *Cache) StoreBytes(key string, value []byte, ttl time.Duration) error {
    return c.store.Set(c.computeHashKey(key), value, ttl)
}

func (c *Cache) GetBytes(key string) ([]byte, error) {
    return c.store.GetBytes(c.computeHashKey(key))
}

// In route handler
cacheKey := c.GetString("cache_key") // set by middleware from body hash
shouldCache := len(cacheKey) != 0

if shouldCache {
    bytes, err := ca.GetBytes(cacheKey)
    if err == nil && len(bytes) != 0 {
        c.Set("provider", "cached")
        c.Data(http.StatusOK, "application/json", bytes)
        return // served from cache
    }
}

// ... run steps, get response ...

if shouldCache && rc.CacheConfig != nil {
    parsed, _ := time.ParseDuration(rc.CacheConfig.Ttl)
    ca.StoreBytes(cacheKey, bytes, parsed)
}
```

**News.AI application:** Article classification (Brain calls GPT-4o-mini with article text, gets score 1-10) is deterministic for the same input. Caching with a 24h TTL would eliminate duplicate classification calls when articles are re-processed.

---

## Pattern 8: Policy Engine — PII Detection with Graduated Actions

**File:** `internal/policy/policy.go`

Policies support three detection layers run in parallel (AWS Comprehend scan + custom LLM detector) and sequentially (regex). Each detected entity maps to an action: `Block`, `AllowButWarn`, `AllowButRedact`, `Allow`.

```go
type Action string
const (
    Block          Action = "block"
    AllowButWarn   Action = "allow_but_warn"
    AllowButRedact Action = "allow_but_redact"
    Allow          Action = "allow"
)

func (p *Policy) scan(input []string, scanner Scanner, cd CustomPolicyDetector, log *zap.Logger) (*ScanResult, error) {
    sr := &ScanResult{Action: Allow, Updated: input}
    var wg sync.WaitGroup

    // Layer 1: AWS Comprehend PII scan — runs concurrently
    if p.Config != nil && len(p.Config.Rules) != 0 {
        wg.Add(1)
        go func(result *ScanResult) {
            defer wg.Done()
            r, _ := scanner.Scan(result.Updated)

            result.ActionLock.Lock()
            defer result.ActionLock.Unlock()

            // map detected entity types to actions
            for rule, action := range p.Config.Rules {
                _, ok := found[string(rule)]
                if action == Block && ok {
                    result.Action = Block
                } else if action == AllowButRedact && ok {
                    // replace entity span with "***"
                    old := detection.Input[entity.BeginOffset:entity.EndOffset]
                    replaced = strings.ReplaceAll(replaced, old, "***")
                }
            }
        }(sr)
    }

    // Layer 2: Custom LLM-based detector — runs concurrently
    if p.CustomConfig != nil {
        for action, reqs := range actionToRequirements {
            wg.Add(1)
            go func(action Action, reqs []string, result *ScanResult) {
                defer wg.Done()
                found, _ := cd.Detect(input, reqs)
                if action == Block && found {
                    result.Action = Block
                }
            }(action, reqs, sr)
        }
    }

    wg.Wait()

    // Layer 3: Regex rules — runs after async layers complete
    // ... compile and match each regex rule ...

    return sr, nil
}
```

**News.AI application:** Not immediately needed, but the graduated action pattern (`Block / Warn / Redact / Allow`) is useful for content moderation in News.AI publisher — e.g., redact phone numbers from scraped articles before generating posts, or warn when a playbook prompt matches a hate speech regex.

---

## Middleware Chain Order (Critical)

**File:** `internal/server/web/proxy/proxy.go`

```go
router.Use(CorsMiddleware())
router.Use(getTimeoutMiddleware(timeout))   // sets c.Set("requestTimeout", ...)
router.Use(getMiddleware(...))              // auth + policy + body parse + event publish
// then route-specific handlers
```

The order is: CORS → timeout → auth/policy → handler. The timeout middleware runs FIRST because the auth middleware reads `c.GetDuration("requestTimeout")` to create per-request contexts. If order is reversed, timeout is not available during auth.

The `x-request-timeout` header allows per-request timeout override — useful for streaming vs non-streaming calls.

---

## Key Dependencies (Go modules)

```
github.com/cenkalti/backoff/v4   — exponential/constant backoff for retries
github.com/gin-gonic/gin         — HTTP router
github.com/redis/go-redis/v9     — Redis client (rate limiting, caching)
github.com/sashabaranov/go-openai — OpenAI API types (used as canonical schema for all providers)
github.com/tidwall/gjson         — fast JSON path reads without full unmarshal
github.com/tidwall/sjson         — JSON path writes
go.uber.org/zap                  — structured logging
```

---

## News.AI Integration Plan

| BricksLLM Concept | News.AI Equivalent | Migration Path |
|---|---|---|
| Route.Steps[] | Brain's `callLLM()` provider selection | Add `FALLBACK_PROVIDER` env var, wrap in step loop |
| Step.DecorateRequest() | Inline model override in each API call | Extract `decorateRequest(provider, body, model)` helper |
| getApiKey() multi-header extraction | Brain's single `Authorization` check | Copy the 3-source extraction pattern |
| Redis HIncrBy rate limiting | p-queue concurrency control | Add Redis for cross-restart rate limit state |
| MemDb polling | Supabase fetch on each request | Cache playbooks/niches with `updatedAt`-based refresh |
| MessageBus async events | Pino synchronous logging | Add buffered channel, write cost metrics async |
| Cache.StoreBytes(hash, bytes, ttl) | None | Add for article classification dedup |

### Minimal Failover for Brain (Node.js adaptation)

```javascript
// Adapted from BricksLLM's RunStepsV2 for News.AI Brain
const PROVIDER_STEPS = [
  { provider: 'openai', model: 'gpt-4o-mini', retries: 2, timeout: 10000 },
  { provider: 'anthropic', model: 'claude-haiku-20240307', retries: 1, timeout: 15000 },
];

async function callLLMWithFailover(messages, context) {
  const errors = [];

  for (const step of PROVIDER_STEPS) {
    for (let attempt = 0; attempt < step.retries; attempt++) {
      try {
        const result = await pRetry(
          () => callProvider(step.provider, step.model, messages, step.timeout),
          { retries: 0 } // inner: 0 retries, outer loop handles retries
        );
        logger.info({ provider: step.provider, model: step.model, attempt, outcome: 'success' });
        return result;
      } catch (err) {
        if (isClientError(err)) throw err; // 4xx — don't retry/failover
        errors.push({ step: step.provider, attempt, err: err.message });
        logger.warn({ provider: step.provider, attempt, err: err.message, outcome: 'retry' });
      }
    }
    logger.warn({ provider: step.provider, outcome: 'exhausted', next: PROVIDER_STEPS[PROVIDER_STEPS.indexOf(step) + 1]?.provider });
  }

  throw new Error(`All providers failed: ${JSON.stringify(errors)}`);
}
```

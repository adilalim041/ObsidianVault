# Architecture: research-dashboard

**Last verified:** 2026-04-21

## Overview

research-dashboard — React SPA на Vercel, которое читает ObsidianVault через публичный GitHub Contents API и предоставляет UI для управления очередью изучения. Единственная мутация — POST /api/promote, который через GITHUB_PAT пишет JSON-файл в `system/queue/pending/` и обновляет статус кандидата. Никакой собственной БД нет — vault является хранилищем состояния.

## Data flow

```
READ PATH (vault → UI):

[Browser]
    │  GET /repos/adilalim041/ObsidianVault/contents/{path}
    │  Authorization: none (public repo, 60 req/hr limit)
    ▼
[api.github.com / GitHub Contents API]
    │
    ▼
[Memory cache (per session)]
    +
[localStorage cache (TTL 10 мин)]
    │
    ▼
[React components] — recharts, react-markdown


WRITE PATH (promote):

[Browser click "Взять в изучение"]
    │  POST /api/promote
    │  Body: { candidateId, candidateName, reason }
    │  Header: X-Admin-Secret: <ADMIN_SECRET>
    ▼
[Vercel Function api/promote.ts] (maxDuration: 15s)
    │
    ├─ 1. timing-safe compare(X-Admin-Secret, ADMIN_SECRET env)
    │       → 401 если не совпадает
    │
    ├─ 2. zod validate body
    │       → 400 если невалидно
    │
    ├─ 3. GET candidate card из vault (dedup — проверяем нет ли уже в queue)
    │       → 409 если кандидат уже в очереди
    │
    ├─ 4. PUT queue file: system/queue/pending/{candidateId}.json
    │       Authorization: Bearer <GITHUB_PAT>
    │
    └─ 5. PUT candidate status update (опц.)
              ↓
        adilalim041/ObsidianVault (GitHub Contents API)
              ↓
        queue-drain процесс (внешний cron/субагент) подхватывает файл
```

## Caching

Два уровня для снижения нагрузки на GitHub API (лимит 60 req/hr без авторизации):

1. **Memory cache** — per-session in-memory Map. Живёт пока жив tab. Инвалидируется через `clearCache()` вручную или при promote (оптимистично).
2. **localStorage cache** — сериализованный JSON с TTL 10 минут. Переживает F5. Ключ — полный path в vault.

Инвалидация: после успешного promote клиент вызывает `clearCache(path)` для затронутых файлов, следующий fetch пойдёт напрямую в GitHub.

## Secrets

| Переменная | Где хранится | Назначение |
|---|---|---|
| `GITHUB_PAT` | Vercel env (Production only) | Write access к ObsidianVault через Contents API |
| `ADMIN_SECRET` | Vercel env (Production only) | Защита POST /api/promote от анонимных вызовов |
| `DASHBOARD_ORIGIN` | Vercel env (Production only) | CORS allow-origin для promote endpoint |
| `DRY_RUN` | Vercel env | `true` = не пишем в GitHub (для тестов) |

**НЕ используются** `VITE_`-префиксы для секретов — такие переменные попадают в публичный JS-бандл.

## Deploy

```
git push origin main
    │
    ▼
Vercel webhook (автоматически)
    │
    ├─ vite build (Vite 5, ~30 сек)
    ├─ tsc compile api/*.ts → Node 18 serverless
    └─ deploy to CDN (~30 сек)

Итого: ~1 минута от пуша до живого деплоя.
```

Ручной redeploy: Vercel Dashboard → Deployments → Redeploy.
Env vars применяются только при следующем деплое — после добавления переменной нужен redeploy.

## Ограничения и edge cases

- GitHub Contents API без токена: 60 req/hr per IP. Кеш + localStorage покрывает типичное использование.
- Vercel Function maxDuration: 15 сек. GitHub Contents API обычно < 1 сек, запас большой.
- Файловая система Vercel Functions — ephemeral, между вызовами состояние не сохраняется. Это намеренно: всё состояние в vault.
- SPA routing: `rewrites [{ source: "/(.*)", destination: "/index.html" }]` в vercel.json обеспечивает client-side routing.

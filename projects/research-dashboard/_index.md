# PROJECT: research-dashboard

## Identity

- **Project name:** research-dashboard
- **Path on disk:** `C:\Users\User\Desktop\research-dashboard\`
- **Repo:** `adilalim041/research-dashboard` (public)
- **URL:** https://research-dashboard-eight.vercel.app
- **Status:** Active
- **One-line description:** Read-only UI над ObsidianVault + единственный write-endpoint /api/promote для постановки кандидатов в очередь изучения

## Stack

- React 19 + Vite
- Tailwind CSS 4
- Radix UI (headless primitives)
- recharts (графики)
- react-markdown (рендер md-файлов из vault)
- Vercel (хостинг + serverless functions)
- GitHub Contents API (чтение vault — GET без авторизации, запись — PUT через PAT)

## Deploy

- Автодеплой из `main` ветки через Vercel webhook
- Build: `vite build` (~30 сек)
- Serverless: `api/*.ts` → Vercel Functions (Node 18)
- Env vars в Vercel Dashboard (только Production environment)

## Связь с другими проектами

```
research-dashboard
    │ reads (GET, public, no auth)
    ▼
adilalim041/ObsidianVault
    │ writes (PUT via GITHUB_PAT)
    ▼
system/queue/pending/*.json
    │ читает queue-drain (субагент/cron)
    ▼
активирует субагентов → пишут обратно в vault
```

## Project files in this folder

- [_index.md](_index.md) — этот файл, навигация по узлу
- [architecture.md](architecture.md) — data flow, caching, secrets, диаграмма
- [decisions.md](decisions.md) — почему так, а не иначе
- [gotchas.md](gotchas.md) — грабли и edge cases

## Key URLs (без секретов)

- **Dashboard:** https://research-dashboard-eight.vercel.app
- **Repo:** https://github.com/adilalim041/research-dashboard
- **Vault repo:** https://github.com/adilalim041/ObsidianVault

## Source-of-truth checklist

При работе с проектом:
- Promote endpoint → читай `api/promote.ts` напрямую, не полагайся на architecture.md
- GitHub Contents API limits → 60 req/hr unauthenticated, 5000 req/hr authenticated
- Vercel env vars → только в Vercel Dashboard (не в коде, не в vault)
- Кеш → два уровня: memory (per-session) + localStorage (10 мин TTL)

**Last verified:** 2026-04-21

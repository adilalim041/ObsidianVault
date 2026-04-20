# Research — Index

**Last rebuilt:** 2026-04-20 (switched from Python agent to CC subagents, subscription-based)

## Architecture overview

```
/research daily           ← slash command или Windows Task Scheduler 13:00
      ↓
research-orchestrator     ← планирует, координирует, пишет отчёт
      ↓
research-scout            ← 6 каналов: GitHub API, Trending, HN, Reddit, Awesome, PH
      ↓
research-light-scorer     ← быстрый отсев (Haiku): метаданные + README + license
      ↓
[ research-architect  +  research-issue-detective  +  research-deps-analyst ]    ← ПАРАЛЛЕЛЬНО на каждом кандидате
      ↓
research-writer           ← сводит 3 drafts в итоговую карточку со score
      ↓
research/candidates/YYYY-MM-DD-{owner}-{repo}.md
```

- **Билинг:** подписка Claude Code, прямой API не используется
- **Источник правды о параметрах:** [config.md](config.md) — ниши, каналы, лимиты, пороги
- **Токен GitHub:** `C:/Users/User/.config/vault-research/.env` (вне vault, scope `public_repo`)

## Subfolders

### 📚 library/  — **Hand-curated, vetted, ready to use**

Первое куда смотреть перед постройкой нового. Каждая запись production-grade.

- [library/_index.md](library/_index.md)
- [library/ui-components/](library/ui-components/_index.md)
- [library/assets/](library/assets/_index.md)
- [library/backend-libs/](library/backend-libs/_index.md)
- [library/ai-libs/](library/ai-libs/_index.md)
- [library/python-libs/](library/python-libs/_index.md)

### 🤖 candidates/ — свежие находки ресёрч-цикла

Каждый `/research daily` добавляет сюда 0-15 карточек. Читать глазами, промотить в `library/` после ручного теста.

- `candidates/YYYY-MM-DD-{owner}-{repo}.md` — RECOMMEND (score >= 7.5) или CONSIDER (6.5-7.4)
- `candidates/.rejected/` — ниже порога, с причиной
- `candidates/.drafts/` — временные файлы пайплайна (удаляются writer'ом)

### 🧪 studies/ — deep-dive разборы конкретных репо

Старые ручные studies. Новая pipeline встроена в candidates (через architect/issues/deps), отдельной папки не требует. Оставлены как архив.

### 📝 runs/ — отчёты каждого прогона

`runs/YYYY-MM-DD_HHMM.md` — план, результаты, rejected с причинами, ошибки.

### 🧠 subagents/ — память каждой роли

После прогона каждый агент дописывает `learnings.md`:
- `subagents/orchestrator/learnings.md`
- `subagents/scout/learnings.md`
- `subagents/scorer/learnings.md` (light-scorer)
- `subagents/structure-scanner/learnings.md` (architect пишет сюда)
- `subagents/issue-detective/learnings.md`
- `subagents/deps-expert/learnings.md`
- `subagents/writer/learnings.md`
- `subagents/backend-expert/learnings.md` (общий для backend-dev + research)
- `subagents/frontend-expert/learnings.md` (общий для frontend-dev + research)

Deleted / unused: `subagents/readme-reader/` (роль объединена в light-scorer).

## Workflow

### Автоматический (daily)

Windows Task Scheduler → `C:\Users\User\Desktop\_research-runner\run.cmd` → `claude -p "/research daily"` в 13:00.

Если ноут выключен — догонит при следующем включении (флаг "run after missed" в Task).

См. `_research-runner/README.md` для setup.

### Ручной

В чате: `/research daily` | `/research quick` | `/research {niche}`

### После прогона

1. Открыть последний `runs/YYYY-MM-DD_HHMM.md` — посмотреть что найдено
2. Просмотреть новые карточки в `candidates/`
3. Для RECOMMEND — решить: тестить, отложить, промотить в `library/`
4. Для CONSIDER — "worth watching", вернёмся через 1-2 месяца

## Rules

- Все записи в vault — без секретов (hook блокирует)
- `research/.dedup.json` — не удалять, это TTL-кэш "seen repos"
- Старый Python-агент `vault-research-agent/` — архивирован, **не запускать**
- Новый pipeline использует подписку CC, а не ANTHROPIC_API_KEY

## What's NOT in research

- Секреты (.env, tokens) — никогда
- Project-specific код — он в проектах
- Random репо которые кто-то упомянул — сначала `/research {niche}` и pipeline решит

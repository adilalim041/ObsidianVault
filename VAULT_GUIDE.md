# VAULT_GUIDE — 60 секунд на карту vault'а

Этот файл — первое что ты читаешь при входе в vault. После прочтения ты знаешь: где что лежит, куда писать, куда не ходить.

## Структура (top-level)

- `about-me.md` — кто такой Adil, предпочтения, non-programmer
- `projects/` — 4 активных + аудиты
  - `omoikiri/`, `news-ai/`, `nexus-ai/`, `research-dashboard/`, `_audits/`
  - Каждый: `_index.md`, `architecture.md`, `decisions.md`, `gotchas.md`, `backlog.md`
- `knowledge/` — project-agnostic паттерны (frontend/backend/integrations/design/devops)
- `patterns/` — `pre-flight-checklist.md`, `common-mistakes.md`, `threat-modeling-3-lines.md`
- `incidents/` — `YYYY-MM-DD-slug.md` с разбором багов + `_worklog.md` (автоматический git activity log)
- `research/`
  - `candidates/` — OS-кандидаты для изучения (+`.rejected/`, `.drafts/`)
  - `meta/` — наши собственные мета-анализы (НЕ кандидаты)
  - `library/` — уже принятые и изученные, reusable (см. `library/_index.md`, 44 карточки)
  - `studies/` — глубокие разборы кандидатов (tier A/B)
  - `subagents/<name>/learnings.md` — накопленные уроки агентов
  - `blueprints/` — архитектурные эскизы фич
- `system/`
  - `queue/{pending,processing,done,failed}/` — задачи для `/queue-drain`
  - `telemetry/agent_runs.jsonl` — append-only лог запусков агентов
  - `lib/` — Node-скрипты (`citations_validator.mjs`, `stale_cards_report.mjs`, `vault_github.js`)

## Жизненный цикл OS-кандидата

1. `/research` → scout находит кандидатов → light-scorer отсеивает → architect/issues/deps-analyst делают drafts → writer пишет карточку в `research/candidates/` с `Usage type:` + `Tags:`
2. Adil просматривает дашборд (https://research-dashboard-eight.vercel.app), жмёт кнопку **Promote** → `/api/promote` кладёт задачу в `system/queue/pending/`
3. `/queue-drain` на моей стороне берёт pending → tier A (deep line-by-line) или tier B (README + CHANGELOG + issues + docs/adr) → пишет в `research/studies/`
4. Когда study цитируется ≥3 раз в других работах → promote в `research/library/`

## Hard rules (нарушать нельзя)

- **НЕ пиши секреты** (.env, tokens, keys) — hook блокирует
- **Code > vault**: если vault старше 2 недель (`Last verified:`) и важно — сверяйся с кодом
- **Update existing, не плоди новые** — сначала проверь `_index.md`
- **Запрос к LLM / external API / DB write** → сначала читай `patterns/pre-flight-checklist.md`, отвечай 8 вопросов в чате, потом код
- **Русский для chat**, английский для кода/commit'ов, содержимое vault — match existing

## Что НЕ читать при входе

- `_archive_*` — старая система, не использовать
- `.obsidian/` — UI-конфиг, не контент
- `~/.claude/projects/` — это separate auto-memory Claude Code, не vault

## Где найти ответ быстрее файла

**Mempalace MCP** — семантический поиск + KG по всему vault. Всегда спрашивай ПЕРЕД чтением файлов:

- `mempalace_search "image compression pipeline"` — free-text
- `mempalace_kg_query {entity: "Omoikiri.AI"}` — структурные факты
- `mempalace_follow_tunnels` — inter-room links (research → projects)

Если Mempalace вернул готовую библиотечную карточку или известный паттерн — используй, не изобретай.

## Еженедельные скрипты

- `node system/lib/stale_cards_report.mjs` — promoted-но-не-studied, library stale 90+ дней, orphan studies
- `node system/lib/citations_validator.mjs` — детектор галлюцинаций в telemetry цитированиях

Запускать вручную или через cron. Exit code 1 = есть что посмотреть.

# system/telemetry

Append-only JSONL logs. One file per metric family. Never edited in-place.

## agent_runs.jsonl

One line per subagent invocation from `/queue-drain`. Shows which learnings/library cards were read and used, to measure whether the knowledge base actually helps.

**Schema:**
```json
{
  "ts": "2026-04-20T17:05:00Z",
  "agent": "backend-dev",
  "task_id": "2026-04-20T154223Z-blueprint-medical-records-assistant-for-clinics",
  "task_type": "blueprint",
  "learnings_read": ["research/subagents/backend-expert/learnings.md"],
  "learnings_used": ["backend-expert#pg-boss-retry", "backend-expert#pino-structured-logs"],
  "library_read": ["backend-libs/_index.md", "ai-libs/_index.md"],
  "library_used": ["backend-libs/pg-boss", "ai-libs/anthropic-sdk"],
  "studies_used": [],
  "notes": "pg-boss card accurate for v10; anthropic-sdk card missing BAA note — flagged",
  "missing_citations": false
}
```

**Fields:**
- `learnings_read` — файлы учения, которые агент открыл (любой уровень вложенности).
- `learnings_used` — конкретные разделы/правила, которые повлияли на выход (якоря вида `<slug>#<section>` или свободный текст).
- `library_read` / `library_used` — аналогично для карточек библиотек.
- `studies_used` — карточки из `research/studies/`.
- `notes` — свободный текст, что было полезно / что устарело / что отсутствовало.
- `missing_citations` — true, если агент не выдал citation-блок (оркестратор ставит вручную).

## Rationale

Цель — отличить **живое знание** (`_used` > 0 за неделю) от **мёртвого груза** (`_read` есть, `_used` нет).

Недельный ридер (см. `system/lib/telemetry_report.mjs` — будет создан позже) агрегирует:
- Топ-10 самых используемых learnings.
- Список карточек library/, которые не использовались ≥ 30 дней.
- % выполнений, где агент не выдал citations.

## Append rules

- Никогда не редактировать прошлые строки.
- Ротация: раз в квартал архивируется в `agent_runs-YYYYQn.jsonl.gz` (вручную, позже).
- Не коммитить ротированные архивы в git без явного решения — могут быть большие.

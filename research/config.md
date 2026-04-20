# Research Agent — Config

**Last updated:** 2026-04-20
**Runs at:** 13:00 daily via Windows Task Scheduler, or manually via `/research`
**Auth:** `C:/Users/User/.config/vault-research/.env` (GH_TOKEN, outside vault)
**Billing:** Claude Code subscription (NOT direct API)

## Tooling notes

- **`jq`** — GitHub releases CDN blocked on this ISP, so we use a Python shim at `C:/Users/User/.config/vault-research/jq.py` wrapped as `/c/Users/User/bin/jq` shell script. Supports the subset of jq syntax used by agents: `.field`, `.a.b`, `."quoted-key"`, `.arr[]`, `select(.k == "v")`, `@base64d`, `-r` raw mode, comma outputs. If you need a filter the shim doesn't handle — extend `jq.py` or fallback to `python -c "import sys,json; ..."`.
- **`curl`** — standard git-bash curl, available.
- **Rate-limit friendly:** always source env first so GH_TOKEN is present; unauthed rate is 60/hr, authed is 5000/hr.

---

## Projects (stack context for scoring)

| Project | Stack | Vault folder |
|---|---|---|
| Omoikiri.AI | Node + Supabase + WhatsApp (Baileys) + React/Tailwind | `projects/omoikiri/` |
| News.AI | Node multi-service on Railway + Gemini + Sharp + Express | `projects/news-ai/` |
| Nexus.AI | Python + Telegram (aiogram) + SQLite + local AI/media | `projects/nexus-ai/` |

---

## Channels (sources) — 6

| # | Channel | How | Rate | Notes |
|---|---|---|---|---|
| 1 | **GitHub Search API** | `curl -H "Authorization: Bearer $GH_TOKEN" 'https://api.github.com/search/repositories?q=...'` | 30 req/min search, 5000/hr core | Primary precise search — **3 стратегии семплинга** (см. ниже) |
| 2 | **GitHub Trending** | `WebFetch https://github.com/trending/{lang}?since=weekly` | unlimited | Parse HTML for repo names |
| 3 | **HN Algolia API** | `curl 'https://hn.algolia.com/api/v1/search?tags=show_hn&numericFilters=points>50&hitsPerPage=30'` | unlimited, no auth | Show HN validated by community |
| 4 | **Reddit JSON** | `curl 'https://www.reddit.com/r/{sub}/top.json?t=week&limit=25'` + User-Agent header | ~60 req/min | Subs listed below |
| 5 | **Awesome-lists** | `WebFetch https://raw.githubusercontent.com/{owner}/awesome-{topic}/main/README.md` | unlimited | Curated lists |
| 6 | **Product Hunt** | `WebFetch https://www.producthunt.com/feed` (RSS) | unlimited | SaaS/launch |

**WebSearch** — fallback only, for niches not covered by above.

### GitHub Search — 3 стратегии семплинга (анти-звёздный-bias)

Раньше scout использовал только `sort=stars&per_page=15` → одни и те же топы каждый день, молодые gem'ы невидимы. Теперь для каждого keyword запускаем **3 параллельные стратегии**:

| Стратегия | Запрос | Зачем |
|---|---|---|
| **A. Authority** | `stars:>100 pushed:>2025-10-01 sort=stars per_page=30` | Проверенные лидеры — подтверждают тренд |
| **B. Activity** | `stars:>30 pushed:>2026-03-01 sort=updated per_page=30` | Живые прямо сейчас, независимо от звёзд |
| **C. Freshness** | `stars:>30 created:>2025-10-01 sort=stars per_page=30` | Молодые проекты — gem'ы у которых впереди рост |

Все 3 результата объединяются → дедуп по `full_name` → ВСЕ идут в light-scorer (не обрезаем по позиции). Freshness-стратегию пропускать НЕЛЬЗЯ — это единственный канал молодых.

### Reddit subs to check (channel 4)

`selfhosted`, `opensource`, `webdev`, `sideproject`, `programming`, `nextjs`, `node`, `reactjs`

### Awesome-lists to check (channel 5) — rotate across runs

Per niche:
- `sindresorhus/awesome` (meta)
- `vinta/awesome-python`
- `enaqx/awesome-react`
- `sorrycc/awesome-javascript`
- `avelino/awesome-go`
- `punkpeye/awesome-mcp-servers`
- `steven2358/awesome-generative-ai`
- `agarrharr/awesome-cli-apps`

---

## Niches — 23

### Project-driven (5)

**1. frontend-ui**
Keywords: `react dashboard components`, `shadcn alternatives`, `tailwind ui blocks open source`, `crm interface react`, `react admin panel template`, `react data table`, `react chart library lightweight`, `headless ui components`
Max per run: 3

**2. whatsapp-tools**
Keywords: `whatsapp bot nodejs baileys`, `whatsapp crm open source`, `baileys whatsapp library`, `whatsapp automation github`, `chat bot framework multi-channel`, `customer support chat open source`
Max per run: 2

**3. content-media**
Keywords: `rss parser nodejs`, `image generation api open source`, `social media scheduler open source`, `headless cms`, `media processing pipeline`, `image optimization open source`, `video transcoding open source`
Max per run: 3

**4. ai-tools**
Keywords: `llm structured output library`, `ai api retry fallback`, `llm gateway router`, `prompt engineering framework`, `llm observability tracing`, `rag retrieval augmented`, `vector database open source`, `ai agent framework typescript`, `function calling llm`
Max per run: 3

**5. python-tools**
Keywords: `telegram bot framework python async`, `python task scheduler async`, `python web scraper async`, `fastapi template production`, `python cli framework`, `python automation desktop`, `pydantic patterns advanced`
Max per run: 2

### Discovery (6)

**6. trending-github**
Channel: GitHub Trending (daily+weekly, per language: typescript, python, go, rust)
Max per run: 4

**7. saas-boilerplate**
Keywords: `open source saas boilerplate`, `open source crm`, `open source erp`, `open source helpdesk`, `open source analytics platform`, `open source notification system`, `open source workflow automation`
Max per run: 3

**8. ai-new**
Keywords: `new ai agent framework`, `mcp server`, `claude code extensions`, `ai coding assistant open source`, `llm fine tuning tools`, `ai voice assistant open source`, `multimodal ai framework`, `ai image generation open source`
Max per run: 3

**9. hn-trending**
Channel: HN Algolia (Show HN, points>50, last 7 days)
Max per run: 4

**10. devops-infra**
Keywords: `railway deployment`, `supabase edge functions`, `job queue postgres nodejs`, `github actions reusable workflows`, `docker compose production`, `monitoring alerting open source`, `log aggregation open source`
Max per run: 2

**11. databases**
Keywords: `supabase alternatives`, `postgresql extensions`, `sqlite tools libraries`, `real-time database`, `database migration tool`, `orm typescript lightweight`
Max per run: 2

### New — 12

**12. mcp-servers**
Keywords: `mcp server`, `model context protocol`, `claude mcp`, `cursor mcp`, `agentic infrastructure`
Awesome: `punkpeye/awesome-mcp-servers`
Max per run: 3

**13. cli-tools**
Keywords: `modern cli tool`, `tui framework`, `developer cli utility`, `command line productivity`
Awesome: `agarrharr/awesome-cli-apps`
Max per run: 2

**14. auth-libs**
Keywords: `self-hosted auth`, `clerk alternative`, `workos alternative`, `passkey nodejs`, `sso open source`, `better-auth`, `authjs`
Max per run: 2

**15. realtime**
Keywords: `websocket framework`, `realtime collaboration`, `presence sync`, `multiplayer framework`, `liveblocks alternative`, `partykit`
Max per run: 2

**16. payments**
Keywords: `stripe alternative open source`, `self-hosted billing`, `subscription engine`, `invoicing open source`, `payment gateway open source`
Max per run: 2

**17. design-tools**
Keywords: `figma plugin open source`, `icon library new`, `open source design system`, `animation library web`, `motion primitives`
Max per run: 2

**18. browser-automation**
Keywords: `playwright tools`, `browser automation framework`, `web scraping modern`, `anti-bot bypass library`, `stagehand alternative`
Max per run: 2

**19. voice-ai**
Keywords: `tts open source`, `stt open source`, `voice agent framework`, `whisper alternatives`, `piper tts`, `realtime voice ai`
Max per run: 2

**20. observability**
Keywords: `open source logging`, `distributed tracing`, `error tracking sentry alternative`, `uptime monitoring open source`, `apm open source`
Max per run: 2

**21. data-engineering**
Keywords: `etl pipeline open source`, `dbt alternative`, `dagster`, `streaming data framework`, `data validation python`
Max per run: 2

**22. security-tools**
Keywords: `secret detection`, `sast open source`, `sbom tool`, `dependency scanner`, `container scanner open source`
Max per run: 2

**23. dev-analytics**
Keywords: `posthog alternative`, `self-hosted product analytics`, `session replay open source`, `heatmap open source`
Max per run: 2

---

## Scoring thresholds

### Light scorer (stage 1 — Haiku-equivalent, cheap)
- `min_stars`: 30 (raised from 20 — enough signal)
- `min_recent_activity`: last commit < 6 months
- `license_whitelist`: MIT, Apache-2.0, BSD-2/3, ISC, CC0, Unlicense, MPL-2.0
- Pass = worth deep analysis. No card written yet.

### Deep analysis (stage 2 — Sonnet-equivalent, only for light-pass)
- Architect + Issue Detective + Deps Analyst + (optional) Backend/Frontend specialist
- Each writes a section of the candidate card
- Final `score` 0-10 calculated from 4 signals:
  - **usefulness** to our 3 projects (0-10)
  - **architecture** quality (0-10)
  - **maintenance** signal — commits/issues/abandoned (0-10)
  - **safety** — license, deps freshness, known CVEs (0-10)
- Card written if avg >= 6.5

---

## Run limits (per run, safety cap)

- Max candidates scouted: 80 (across all niches; увеличено с 60 из-за 3 стратегий)
- Max light-scored: 80 (**ВСЕ** scouted проходят через light — никаких "топ N по позиции")
- Max deep-analyzed: 20
- **max_deep_per_niche: 2** — fair-share: не более 2 кандидатов из одной ниши в deep analysis (защита от перекоса hype-нишами)
- Max cards written: 15
- Max GitHub API calls: 800 (headroom under 5000/hr)
- Dedup TTL: 14 days (seen repos skipped for 2 weeks)

## Fair-share отбор (orchestrator, перед deep analysis)

Алгоритм в Этапе 3 orchestrator'а:
1. Группируй PASS-кандидатов по `niche`
2. Из каждой ниши бери top-2 по `priority_hint`
3. Если общий набор < 20 — добивай из ниш, где было >2 PASS, в порядке убывания priority_hint

Это гарантирует: если `ai-new` дал 15 PASS, а `databases` — 1, в deep пойдёт 2+1+... а не 15 ai-new'ных с затиранием всего остального.

---

## Rotation

On each run, scout **rotates** keywords within a niche — uses only 2-3 from the list, not all. Prevents same-query repetition that led to "0 cards" on 2026-04-12.

Awesome-lists rotate across runs (round-robin).

---

## Outputs

- Candidate cards: `research/candidates/YYYY-MM-DD-{owner}-{repo}.md`
- Run report: `research/runs/YYYY-MM-DD_HHMM.md`
- Dedup state: `research/.dedup.json` (tracks seen repos + expiry)
- Subagent learnings: `research/subagents/{role}/learnings.md` — appended by each agent after its part

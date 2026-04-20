# PrefectHQ/fastmcp

**URL:** https://github.com/PrefectHQ/fastmcp
**Discovered:** 2026-04-20
**Niche:** mcp-servers
**Found via:** github-search:mcp-servers:mcp+server+stars:>100
**Stars:** 24,670 (1,935 forks)
**License:** Apache-2.0
**Language:** Python
**Homepage:** https://gofastmcp.com

## TL;DR

Де-факто стандарт для построения MCP серверов и клиентов на Python. 24.7k звёзд за 17 месяцев, бэкит PrefectHQ, релизы каждые 3-4 дня. Модульная архитектура (providers/middleware/transforms/auth), строгая типизация на pydantic 2, асинхронность от низа до верха. **Для Nexus.AI — прямое попадание**: позволяет либо экспонировать функции Nexus (память, медиа-генерация, SQLite queries) в виде MCP-сервера, либо потреблять внешние MCP-серверы (GitHub, Figma, docs). Главный caveat — 8 security advisories (2 high в OAuth proxy), но все дисклозятся и патчатся maintainer'ами.

## Verdict

**Decision:** RECOMMEND
**Final score:** 8.25/10
- Usefulness: 9/10 (по Nexus; 2/10 для Node-проектов)
- Architecture: 9/10
- Maintenance: 9/10
- Safety: 6/10

## Fit per project

- **Omoikiri.AI:** 2/10 — Python-only, для Node есть `mcp-use/mcp-use` (отдельный кандидат на анализ)
- **News.AI:** 2/10 — та же причина (Node stack)
- **Nexus.AI:** **9/10** — идеально для превращения Nexus в MCP-сервер (или клиент). Позволит другим AI-клиентам (Claude, Cursor) использовать память/SQLite/медиа-генерацию Nexus как инструменты

## What's inside (architecture)

- **Mixin-based** `FastMCP` класс поверх официального `mcp` SDK: `LifespanMixin + MCPOperationsMixin + TransportMixin + ...`
- **Providers-дерево:** `AggregateProvider` объединяет несколько MCP-серверов в один (композиция), `ProxyProvider` проксирует чужой сервер
- **Middleware chain** (Starlette-стиль) с caching, logging, rate limit
- **Auth pluggable:** JWT, OAuth Proxy, OIDC, Azure — выбирай под задачу
- **Transforms:** изменяют tools/prompts на лету без правки исходного
- **Transports:** stdio, HTTP, WebSockets (через uvicorn + websockets)
- **UX-фокус:** 170 examples, 568 файлов docs, полноценный CLI (`fastmcp install/run/dev` с авто-релоадом)
- **Lazy imports** для холодного старта (issue #3292 — осознанное решение)
- Два крупных файла (server.py и oauth_proxy/proxy.py по 96 KB) — приемлемо, разбиты mixins-ами

## Community & maintenance

- **Супер-активные:** коммиты каждые несколько часов, 4 релиза за 12 дней (v3.2.1→v3.2.4), параллельный LTS v2.x
- **Корпоративный backing:** PrefectHQ (компания с 15k★ workflow engine)
- **HN:** "Welcome to FastMCP" 80 points в марте 2026 (устойчивый позитив, не однодневный hype)
- **Issues:** 223 open, но ratio нормальный для 24.7k★. Response time на closed — 4-5 дней
- **Security awareness:** регулярно рефлюшат OWASP-style фиксы ("Reject dot-segments in redirect URI"), borrows dependabot
- **Dogfood:** CLAUDE.md и .cursor/ в репо — команда сами юзают AI-тулы
- **Windows CI** — поддержка реальной мультиплатформенности (редкость для Python)

## Supply chain

- 24 runtime deps + 7 optional групп (anthropic/openai/gemini/azure/apps/code-mode/tasks)
- Modern stack: pydantic 2, httpx, uvicorn, websockets 15+, rich 13+, cyclopts 4 (современная альтернатива click)
- `uv` + lockfile + `justfile` + pre-commit — зрелый dev workflow
- Совместимость с Nexus (Python 3.11, aiogram, pydantic 2): ✅ нет конфликтов

## Risks / red flags

- 🚫 **8 GitHub Security Advisories** — 2 HIGH (SSRF/Path Traversal в OpenAPI Provider, Missing Consent в OAuth Proxy). Все запатчены, но: если в Nexus используем **OpenAPI Provider** или **OAuth Proxy** — нужен апгрейд политики (использовать последнюю патч-версию всегда)
- ⚠️ **authlib (dep)** — 13 CVE в 2025-2026. Fastmcp пинит `authlib>=1.6.11`. Проверить что floor закрывает свежие CVE — перед внедрением запустить `pip-audit`
- ⚠️ Молодой проект (16 месяцев), v2→v3 breaking change уже был — API **будет** ещё меняться
- ⚠️ Две малоизвестные deps: `py-key-value-aio`, `griffelib` — проверить maintainership перед продом
- ⚠️ Регрессии в свежих релизах (issue #3955 — docstrings в v3.2.4) — ставить на stable, не на rc

## Next step

**Для Nexus.AI:** прототипировать `nexus-mcp-server.py` — тонкую обёртку поверх fastmcp, экспонирующую:
1. `memory.save(content, tags)` — запись в SQLite
2. `memory.search(query)` — поиск
3. `media.generate(prompt, type)` — Stable Diffusion / TTS
4. `telegram.send(chat_id, msg)` — отправка в telegram

Это даст Claude Code или Cursor доступ к Nexus-возможностям как к обычным tools. **Время на прототип:** 2-3 часа.

**Перед тем как делать:** прогнать `pip-audit` против `authlib>=1.6.11` — убедиться что нет unpatched CVE.

**Промоутить в library/python-libs/** только после реального прототипа. Сейчас — оставить в candidates/ на 2-3 недели, мониторить стабильность v3.2.x (регрессии бывают частыми, нужен settling period).

## Sources

- Architect draft: `research/candidates/.drafts/PrefectHQ-fastmcp/architect.md`
- Issues draft: `research/candidates/.drafts/PrefectHQ-fastmcp/issues.md`
- Deps draft: `research/candidates/.drafts/PrefectHQ-fastmcp/deps.md`

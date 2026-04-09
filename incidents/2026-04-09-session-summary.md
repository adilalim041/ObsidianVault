# 2026-04-09 — Major session: vault + parser + hooks + library

**Duration:** ~8 hours
**Scope:** Built entire ObsidianVault infrastructure from scratch

## What was built

### 1. ObsidianVault (C:/Users/User/Desktop/ObsidianVault/)
- 100+ markdown files
- 3 projects documented from interview (Omoikiri, News.AI, Nexus)
- `about-me.md` with Adil's profile, goals, fears
- `knowledge/` with 3 cross-project knowledge nodes
- `research/library/` with 44 hand-curated tool cards (5 categories)
- `research/subagents/` with 8 subagent memory folders (role + learnings)
- `incidents/_worklog.md` auto-populated by git hooks

### 2. vault-research-agent (C:/Users/User/Desktop/vault-research-agent/)
- Custom Python research agent with 8 LLM-powered subagents
- Subagents: Scout, README Reader, Structure Scanner, Frontend Expert, Backend Expert, Deps Expert, Scorer, Card Writer
- Each subagent has: role.md (instructions), learnings.md (self-improving memory)
- Uses: Anthropic API (direct), DuckDuckGo (free search), GitHub API, trafilatura
- SQLite dedup with TTL (7-day window)
- 9 search niches configured (project-specific + trending + popular)
- Phase 2 deep analysis: reads actual source code, not just README
- Security: wrap_untrusted() XML tags, learning sanitization, LLM call counter
- Total: ~1200 lines Python across 15 files

### 3. Claude Code hooks (~/.claude/hooks/)
- `vault-secret-scan.py` — PreToolUse: blocks JWT/API keys in vault writes
- `vault-autoload.py` — SessionStart: auto-injects project context + library map
- `vault-stop-reminder.py` — Stop: forces Claude to update vault after editing project code
- `git-post-commit-template.sh` — installed in all 3 projects, writes to _worklog.md

### 4. Skills
- `/briefing` — morning briefing skill: reads backlog + fresh candidates, proposes actions

### 5. Scheduled tasks
- `vault-nightly-synth` — 03:33 daily (reads worklog, synthesizes into vault)
- Note: only works when Claude Code is open (local scheduled task)

### 6. Safety
- All 3 projects have git checkpoint commits before vault work
- wa-bridge: 179e299, news-project: e6c1f64, AbdAdl: 85a9071
- Old agent-office archived in _archive_agent_office/

## Diagnostic: 30 issues found, 10 fixed

Critical/High fixes applied:
- python-dotenv in requirements.txt
- Shared AsyncAnthropic client (was 8 separate)
- Prompt injection defence (wrap_untrusted on all external data)
- Learning sanitization (blocks "ignore instructions" patterns)
- DuckDuckGo rate limiting (2s between requests)
- LLM call counter (enforces max_llm_calls)
- License filter (repos without license now filtered)
- GitHub auth on all requests
- Logs/state/candidates mkdir on startup

20 medium/low issues remain — see 2026-04-09-parser-diagnostic.md

## Key decisions made

1. Vault over agent-office — knowledge by topic, not by agent
2. Hybrid code+skill architecture — Python for parser (works without Claude Code), skills for Claude Code integration
3. No gpt-researcher (concept mismatch + Anthropic friction) — custom agent instead
4. No auto npm-install of foreign repos (security) — read-only research
5. OS-level cron for night runs (Windows Task Scheduler can wake from sleep)
6. Subagent memory in vault (not in code repo) — visible in Obsidian

## Adil's stated goals and ideas

### Immediate
- Use vault to make Claude Code actually remember across sessions
- Research agent finds tools overnight, Claude applies them by day
- `/briefing` auto-proposes what to do each morning

### Short-term ideas Adil expressed
- Nexus.AI as "command center" for the whole vault (Telegram bot reads vault, answers "what's new", "project status")
- GitHub Actions for parser (works when laptop is off)
- Add YouTube, Reddit, Hacker News as parser sources
- MCP server from parser (Claude Code uses it directly)
- Deeper subagent specialization (Phase 3: frontend/backend experts per project, not just per repo)

### Long-term vision
- Template every project so new ones start from vault patterns
- Nexus productizable as "Jarvis assistant" (viral demo angle)
- News.AI multi-channel brand (multiple niches, one identity)
- Omoikiri.AI templatable for other businesses
- All projects learning from each other through vault knowledge nodes

## Technical debt / next steps

1. Fix 429 rate limit in writer (sequential instead of parallel) — 5 min
2. Test vault-nightly-synth manually — 10 min
3. GitHub Actions for parser — 1 hour
4. Nexus vault integration — 2-3 hours
5. Medium/low fixes from diagnostic — 30-40 min
6. New parser sources (YouTube/Reddit/HN) — 1-2 hours per source
7. Cross-model review for parser quality (one LLM reviews another's work) — 1 hour

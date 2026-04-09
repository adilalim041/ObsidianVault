# 2026-04-10 — Major session: Nexus deploy + dashboard + agent system

**Duration:** ~6+ hours
**Scope:** Nexus bot audit/refactor/deploy, Research Dashboard, Agent architecture

## What was built

### 1. Nexus.AI — full production deployment
- **22 bugs fixed** from comprehensive audit (4 critical, 7 high, 8 medium, 3 low)
- **Refactored** 2400-line bot.py monolith → 10 modular files (aiogram v3 Router pattern)
- **Deployed on Railway** 24/7 — no longer depends on laptop
- **Vault integration:** /vault, /status, /research commands + vault Q&A (ask any question)
- **Gemini 2.0 Flash** (free) for intent classification on Railway + Claude Haiku fallback
- **RPA safety:** per-step confirmation before pyautogui execution

### 2. Research Dashboard (web)
- **Path:** `C:/Users/User/Desktop/research-dashboard/`
- **Stack:** React + Vite + Tailwind, deployed on Vercel
- **URL:** https://research-dashboard-eight.vercel.app
- **Pages:** Главная (stats + recent candidates), Кандидаты, Библиотека, Субагенты
- **Data:** GitHub API reading ObsidianVault (public repo)
- **Russian UI**, localStorage cache, GitHub links on cards

### 3. Agent system (.claude/agents/)
- Created 3 specialist agents at `~/.claude/agents/`:
  - `frontend-dev.md` — React, Tailwind, shadcn, reads frontend-expert/learnings.md
  - `backend-dev.md` — Node, Python, Supabase, reads backend-expert/learnings.md  
  - `integrations-dev.md` — Railway, GitHub Actions, reads deps-expert/learnings.md
- Each agent MUST read vault learnings before writing code
- CLAUDE.md updated with mandatory delegation rules
- Agents share knowledge brain with nightly parser subagents (same learnings.md files)

### 4. Parser improvements
- **Hacker News** added as search source (free API, no key needed)
- **7 medium/low fixes:** datetime.utcnow, is_in_library cache, SQLite WAL, run report collision, specialist models, run.bat locale, config.yaml
- **All diagnostic issues closed**
- GitHub Actions confirmed working (6m17s run, found hackertab.dev)

### 5. GitHub repos created
- `adilalim041/ObsidianVault` — now PUBLIC (for dashboard access)
- `adilalim041/vault-research-agent` — private, GitHub Actions nightly
- `adilalim041/nexus-ai` — private, Railway auto-deploy
- `adilalim041/research-dashboard` — public, Vercel auto-deploy

## Key decisions

1. **Gemini 2.0 Flash over 2.5 Flash on Railway** — 2.5 returns 403 from Railway IP, 2.0 works and is free
2. **Claude Haiku as fallback** — ~$3-5/month if Gemini fails, with full response normalization
3. **ObsidianVault made public** — no secrets in vault, enables free GitHub API access for dashboard
4. **Agents as knowledge-enhanced developers** — not just consultants, they write actual code using accumulated learnings from nightly parser

## What's next (from roadmap-phase3.md)

1. **Dashboard polish:** detailed candidate cards (usage ideas, potential), search/network visualization, Recharts graphs
2. **Expert Consultant Agents:** enhance agent prompts, add Recommender subagent (auto-matches findings to project backlogs)
3. **Parser expansion:** Reddit + YouTube sources, cross-model review
4. **Writer subagent improvement:** more detailed cards (how to use, potential applications, code examples)

## Technical debt

- Nexus bot: media_providers.py still synchronous (requests + time.sleep in to_thread)
- Dashboard: no Recharts chart yet (was causing React error #310, removed)
- Nexus bot: Claude Haiku normalize edge cases may still exist for some intents
- runtime_guard.py: process scan removed (was too aggressive), now lock-file only

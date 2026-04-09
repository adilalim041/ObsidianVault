# Nexus.AI — Phase 3 Roadmap

**Created:** 2026-04-10
**Status:** Planned, not started

## 1. Research Dashboard (web)

**Goal:** Visual web interface for research results. Telegram = quick status, Dashboard = deep analysis.

**Stack:** React + Tailwind → Vercel (free)

**Pages:**
- Main: last run stats, daily graph, health status
- Candidates: card grid with scores, descriptions, target project, "read more"
- Subagents: each agent's role, learning count, recent insights
- Library: all approved tools with filters (by category, stack, project)
- Analytics: which niches find best tools, trends over time

**Data source:** ObsidianVault GitHub repo → fetch markdown at build time or via GitHub API

**Design goal:** Portfolio-worthy. Visual, clean, shareable. Adil wants to show this to people.

## 2. Expert Consultant Agents

**Goal:** Subagent knowledge actively used during coding sessions, not just stored.

**How it works:**
1. Create `.claude/agents/` with specialist agents:
   - `frontend-consultant.md` — reads frontend-expert/learnings.md + library/ui-components/
   - `backend-consultant.md` — reads backend-expert/learnings.md + library/backend-libs/
   - `deps-consultant.md` — reads deps-expert/learnings.md + all library cards
2. Each agent has instructions: "You are a frontend consultant. You've analyzed 100+ repos. Before suggesting code, check your learnings for relevant patterns."
3. When Claude Code works on a task:
   - Spawns relevant consultant via Agent tool
   - Consultant searches their knowledge for applicable patterns
   - Returns: "I saw X pattern in repo Y, here's how to apply it to your project"
   - Claude Code writes the actual code using this advice

**Key insight:** Subagents don't write code — they ADVISE. Claude Code writes code. But the advice is based on real analysis of real repos, not generic knowledge.

## 3. Subagent → Project Bridge

**Goal:** Nightly research becomes actionable recommendations per project.

**Implementation:**
- New parser phase: after scoring, a "Recommender" subagent matches high-score candidates to specific project backlogs
- Output: `research/recommendations/{project}/{date}.md`
- Example: "Omoikiri backlog says 'improve dashboard charts' → Tremor (8.2/10) does exactly this. Here's how to integrate..."
- Nexus bot shows these via /vault or dashboard

## 4. New Parser Sources

- Reddit (r/opensource, r/selfhosted) — needs API key
- YouTube dev channels — parse descriptions for GitHub links
- Cross-model review — one LLM finds, another validates quality

## Priority Order

1. Research Dashboard — visual, portfolio piece, useful daily
2. Expert Consultants — makes coding sessions smarter
3. Recommender subagent — automated project-specific advice
4. New sources — more data volume

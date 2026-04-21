# Deep analysis of 7 research agent projects for custom parser

**Usage type:** reference
**Tags:** #agents #ai
**Date:** 2026-04-09
**Status:** Analysis complete, awaiting decision
**Purpose:** Find existing code and patterns we can reuse when building a custom vault research agent for Adil.

## Disclaimer about depth

This analysis was done via **WebFetch of README files and repository pages**, not by cloning repos and reading source code line by line. The verdicts below are based on:
- README documentation
- Module/directory listings
- License files
- Star counts and activity
- Install instructions

**What this analysis did NOT do:**
- Clone repos locally
- Read individual source files
- Map import/dependency graphs
- Verify coupling tightness between modules
- Test extraction of specific utilities

For anything we actually want to adopt, a deeper audit (read the actual code) is warranted before committing.

## Projects analyzed

### 1. gpt-researcher — 26.3k stars — Apache 2.0 — Python
- **URL:** https://github.com/assafelovic/gpt-researcher
- **Verdict:** 🟡 Paradigm mismatch + Anthropic friction
- **What it does:** Autonomous research engine producing 2000+ word reports with citations
- **Why not the whole thing:** We want short 50-line cards, not long reports. Anthropic-only users need HuggingFace/Cohere for embeddings (extra setup). Heavy stack (langchain + deps).
- **What to lift:**
  - `retrievers/` abstraction pattern (swappable search backends via interface)
  - `scraper/` approach to clean content extraction
  - Multi-provider LLM config pattern from `config/`
- **Usable as library?** Yes — `pip install gpt-researcher` + `from gpt_researcher import GPTResearcher`. Mature library surface.

### 2. Hermes Agent — 37k stars — MIT — Python + Node
- **URL:** https://github.com/nousresearch/hermes-agent
- **Verdict:** ❌ Too heavy to extract cleanly
- **What it does:** Self-improving AI agent with 40+ tools, memory, cron, messaging gateways (Telegram/Discord/Slack), CLI
- **Why heavy:**
  - 30+ modules with interdependencies (agent/, gateway/, skills/, cron/, acp_adapter/, acp_registry/, hermes_cli/, tools/, tinker-atropos/)
  - NOT marketed as a library — marketed as a CLI tool + service
  - Install requires bash installer script that sets up whole ecosystem
  - Python + Node mixed stack
  - Modules share state through the agent core — not standalone
- **What to lift (patterns only, not code):**
  - Memory tier architecture (FTS5 + MEMORY.md + USER.md + SOUL.md)
  - Skill registry concept (agentskills.io-compatible)
  - Cron scheduler with platform delivery abstraction
- **Usable as library?** Partially, via RPC subagent spawning. Not a pip import workflow.
- **⚠️ Caveat:** my "too heavy" verdict is inferred from high-level signals (module count, install process, architecture docs), NOT from reading source files. A deeper audit could change this.

### 3. ARIS (Auto-Research-In-Sleep) — 5.9k stars — Markdown only
- **URL:** https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep
- **Verdict:** ❌ Wrong domain
- **What it does:** Autonomous ML research — paper writing, experiment running, peer review simulation
- **Philosophy:** 31 markdown skills in `~/.claude/skills/`, no framework
- **Why not:** Domain-specific to academic ML research (papers, LaTeX, adversarial review). Adapting to "find useful libraries" would mean rewriting most of it.
- **What to lift (concepts only):**
  - "Sleep workflow" methodology (autonomous overnight runs)
  - Cross-model review loop (one LLM does, another reviews)
  - Plain-text checkpoints + inline config overrides

### 4. OpenClaw Config — 49 stars — MIT — Python + Markdown — ⭐ Key find
- **URL:** https://github.com/TechNickAI/openclaw-config
- **Verdict:** ✅ Gold mine of patterns
- **What it does:** Transforms Claude Code into a persistent personal AI with 15 integration skills + 7 autonomous workflows
- **Workflows:** email-steward, task-steward, calendar-steward, contact-steward, security-sentinel, cron-healthcheck, learning-loop
- **Skills:** parallel (web research), quo (phone), fathom (meetings), asana (tasks), etc.
- **Key patterns to adopt:**
  1. **OS-level cron via launchd/systemd/Task Scheduler** — NOT APScheduler. This is the critical insight for "runs while laptop sleeps".
  2. **Three-tier memory:** MEMORY.md (always loaded) + daily files + deep knowledge
  3. **Workflow state pattern:** AGENT.md (logic) + rules.md (user prefs, never overwritten) + agent_notes.md (learned patterns)
  4. **UV script format** — Python scripts with inline dependency declarations, no separate venv
- **License:** MIT — free to adopt patterns with attribution

### 5. ContribAI — 225 stars — AGPL-3.0 + Commons Clause — Rust
- **URL:** https://github.com/tang-vu/ContribAI
- **Verdict:** ❌ Rust + AGPL blocks code reuse
- **What it does:** Autonomous agent that discovers repos, analyzes code, generates fixes, submits PRs
- **Why not the code:** Rust codebase (can't share Python) + AGPL license (any derivative must be AGPL, complicates commercial reuse)
- **What to lift (patterns only):**
  - **SQLite TTL-based deduplication** — store `(url_hash, first_seen_at, ttl)`, skip items still within TTL window
  - Multi-agent routing (5 sub-agents with task-tier specialization)
  - Skill-loading system for analysis (on-demand plugins)
- **Value:** Best reference for "don't re-analyze same thing every night" logic

### 6. ddgs (duckduckgo-search) — 2.4k stars — MIT — Python
- **URL:** https://github.com/deedy5/ddgs
- **Verdict:** ✅ Direct pip dependency
- **What it does:** Free metasearch across 9 backends (Bing, Brave, DuckDuckGo, Google, Grokipedia, Mojeek, Yandex, Yahoo, Wikipedia) without any API key
- **Usage:** `pip install ddgs` → `from ddgs import DDGS; DDGS().text(query, max_results=5)`
- **Trade-offs vs Tavily:**
  - Free (no API cost)
  - Self-managed rate limits (could get banned if hammered)
  - No AI-specific ranking
  - No GitHub-specific search (need separate GitHub API)
- **Perfect for:** general web/news/blog searches. Pairs with direct GitHub API calls for repo discovery.

### 7. obsidian-second-brain — 65 stars — MIT — Markdown skill
- **URL:** https://github.com/eugeniughelbur/obsidian-second-brain
- **Verdict:** 🟡 Inspiration only, architecture doesn't fit
- **What it does:** Claude Code skill with 24 commands + 4 scheduled agents (morning/nightly/weekly/health) for Obsidian vault management
- **Why not adopt:** Skill-based approach requires Claude Code to be running. We want true cron independence. We already have working hooks infrastructure — don't need replacement.
- **What to lift (concepts):**
  - Scheduled agents cadence pattern (daily + weekly + health checks)
  - Auto-synthesis approach (extract decisions from conversations, distribute across notes)

## Supporting dependencies identified

Beyond the above, for the custom agent we'd use:

| Package | Role | License |
|---|---|---|
| `anthropic` | Direct Claude API SDK | MIT |
| `trafilatura` | HTML → clean text (better than BeautifulSoup for articles) | Apache 2.0 |
| `requests` | HTTP (GitHub API, RSS) | Apache 2.0 |
| `feedparser` | RSS/Atom parsing (HN, blogs) | BSD |
| `pyyaml` | Config file | MIT |
| `sqlite3` | State (built into Python) | — |

All MIT/BSD/Apache — commercial-safe.

## Key architectural insight

**OS-level cron (Windows Task Scheduler) is strictly better than Python APScheduler for Adil's use case:**

| | APScheduler | Windows Task Scheduler |
|---|---|---|
| Runs if Claude Code closed | ❌ (but this doesn't matter — it's Python) | ✅ |
| Runs if Python process not running | ❌ | ✅ (it starts the process) |
| Can wake laptop from sleep | ❌ | ✅ |
| Runs if laptop is fully shut down | ❌ | ❌ |

**Conclusion:** Windows Task Scheduler is the answer for "research while you sleep", as long as the laptop is in sleep (not shutdown).

## Verdict — what to build

Custom Python agent (~700 lines) that:
1. Uses `ddgs` + GitHub API + `feedparser` as search sources
2. Uses `trafilatura` for clean content extraction
3. Uses `anthropic` SDK directly for LLM calls (no langchain)
4. Uses SQLite with TTL-dedup pattern from ContribAI
5. Uses retriever abstraction pattern from gpt-researcher
6. Uses OS-level cron via Windows Task Scheduler from OpenClaw
7. Reads `vault/projects/*/backlog.md` and `gotchas.md` for search queries
8. Writes candidate cards to `vault/research/candidates/{date}-{slug}.md`
9. Skips items already in `library/` or recent `candidates/` (TTL dedup)

## Open question — subagent architecture

Adil raised the question: should we use **subagents** — one searches, one analyzes, one writes?

**Yes, this is better than one monolithic agent.** See next section for design proposal.

## Sources

- [gpt-researcher](https://github.com/assafelovic/gpt-researcher)
- [Hermes Agent](https://github.com/nousresearch/hermes-agent)
- [ARIS](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep)
- [OpenClaw Config](https://github.com/TechNickAI/openclaw-config)
- [ContribAI](https://github.com/tang-vu/ContribAI)
- [ddgs library](https://github.com/deedy5/ddgs)
- [obsidian-second-brain](https://github.com/eugeniughelbur/obsidian-second-brain)
- [trafilatura](https://github.com/adbar/trafilatura)
- [APScheduler](https://github.com/agronholm/apscheduler)

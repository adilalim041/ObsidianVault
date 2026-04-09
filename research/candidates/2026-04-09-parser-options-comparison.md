# Parser options — WebSearch research, 2026-04-09

> **Source:** Live WebSearch + WebFetch pass done on 2026-04-09 during Claude session.
> **Purpose:** Instead of building a research agent from scratch, find existing open-source solutions and pick one to extend.
> **Key finding:** Multiple mature projects already exist for what we want to build. We should NOT rewrite from scratch.

---

## The big realization

We (Adil + Claude) were about to build a "research agent that populates an Obsidian vault with tool discoveries" from scratch. Turns out **at least 5 projects already exist** that do exactly this pattern, and **at least 3 mature deep-research engines** exist that can power the underlying research step.

This is the same "check library before building" principle we documented, applied to the agent itself. Ironic but instructive.

---

## Category 1 — Deep research engines (find-and-summarize)

These are projects that, given a topic, autonomously search the web, read sources, and produce structured reports.

### 🏆 [GPT Researcher](https://github.com/assafelovic/gpt-researcher) — **recommended base**

- **Stars:** 26.3k | **License:** Apache 2.0 | **Status:** Very active, 2900+ commits, Discord community
- **What it does:** Autonomous deep research agent. Given a topic, produces detailed reports (2000+ words) with citations from 20+ sources. Multi-agent architecture (planner + execution agents).
- **LLM support:** OpenAI, Gemini, any OpenAI-compatible API. Multi-provider.
- **Output formats:** Markdown, PDF, Word, JSON (programmatic via API)
- **Install:** `pip install gpt-researcher` — Python package
- **Extensible:** Yes — MCP integration, LangGraph/AG2 support, config for domain-specific agents
- **Bonus:** Inline image generation via Gemini, can research local documents (PDF, MD, Excel, Word)

**Why it fits Adil:**
- Exactly the "deep research on a topic" primitive we need
- Multi-provider matches the per-task LLM specialization goal
- Apache 2.0 = commercial-safe, can fork
- 26k stars = battle-tested, not some weekend project
- Markdown output → direct to vault/research/candidates/

**What we'd add on top:**
- Read `vault/projects/*/backlog.md` to generate research topics
- Read `vault/research/library/` + `vault/research/candidates/` for deduplication
- Write structured cards to vault in our format (not gpt-researcher's default report format)
- Cron scheduling for nightly runs

**Score: 10/10**

---

### [LangChain Open Deep Research](https://github.com/langchain-ai/open_deep_research)

- **License:** MIT (likely — LangChain standard)
- **What it does:** Simple, configurable deep research agent. Works across model providers, search tools, MCP servers.
- **Status:** Maintained by LangChain team, on par with many popular deep research agents on benchmarks

**Why consider:** Simpler than GPT Researcher, might be easier to customize if GPT Researcher feels too heavy.

**Score: 8/10** — good alternative if we find GPT Researcher overkill

---

### [Tongyi DeepResearch](https://tongyi-agent.github.io/blog/introducing-tongyi-deep-research/)

- **What it does:** First fully open-source Web Agent on par with OpenAI DeepResearch. Strong benchmark scores (32.9 HLE, 43.4 BrowseComp).
- **Trade-off:** New project, less mature as a library. More of a "system" than a drop-in package.

**Score: 7/10** — one to watch, not yet the first pick

---

### [STORM](https://github.com/stanford-oval/storm) (Stanford)

- **What it does:** Multi-agent system that writes Wikipedia-like articles from research. More academic, structured output.
- **vs GPT Researcher:** STORM is rigid (wiki-style output), GPT Researcher is flexible (developer-friendly).
- **Trade-off:** Opinionated output format doesn't match our card structure.

**Score: 6/10** — inspirational, not practical for our use

---

## Category 2 — Obsidian + AI agent integrations (the "vault automation" layer)

These projects do what we've been doing manually: give Claude/AI the ability to autonomously write, organize, and maintain an Obsidian vault.

### 🏆 [obsidian-second-brain](https://github.com/eugeniughelbur/obsidian-second-brain) — **closest to what we built**

- **Stars:** 65 | **License:** MIT | **Status:** Actively maintained
- **What it is:** A Claude Code **skill** (not a plugin) that turns Obsidian vault into autonomous self-evolving knowledge system
- **Key features:**
  - **24 slash commands** (`/obsidian-save`, `/obsidian-init`, etc.) built for Claude Code
  - **4 scheduled agents:**
    - Morning (8 AM): daily note creation, task review
    - Nightly (10 PM): end-of-day summaries, board cleanup
    - Weekly (Fridays 6 PM): weekly reviews
    - Health (Sundays 9 PM): vault integrity audits
  - Background agent fires after context compaction (automatic vault updates)
  - Auto-writes: extracts decisions/tasks/entities from conversations and distributes them, rewrites pages when new info contradicts old, creates synthesis pages, generates daily notes
  - **Layers on existing vaults** (doesn't rebuild)
  - Preset configurations: executive, builder, creator, researcher

**Install:**
```bash
git clone https://github.com/eugeniughelbur/obsidian-second-brain ~/.claude/skills/obsidian-second-brain
bash ~/.claude/skills/obsidian-second-brain/scripts/setup.sh "C:/Users/User/Desktop/ObsidianVault"
```
Then `/obsidian-init` in Claude Code.

**Why it's HUGE for us:**
- Does **50% of what we built today**, as a pre-existing skill
- MIT licensed = we can adopt freely
- Scheduled agents pattern is exactly what we need
- Low star count (65) means it's not famous, but the architecture is correct

**Risk:**
- Only 27 commits and 65 stars — small, niche project, could be abandoned
- Single maintainer — bus factor of 1
- Opinionated structure might conflict with ours

**Score: 9/10** — worth evaluating seriously, possibly adopting partially

---

### [Obsidian AI Agent (m-rgba)](https://github.com/m-rgba/obsidian-ai-agent)

- **What it is:** Obsidian **plugin** that integrates Claude Code directly. Chat, edit files, manage knowledge base inside Obsidian UI.
- **Difference:** It's a plugin (runs in Obsidian), not a Claude Code skill (runs in Claude Code)

**Score: 7/10** — good if Adil wants to work inside Obsidian UI, not our case

---

### [Obsidian Skills (kepano)](https://www.opensourceprojects.dev/post/802e6bcf-1b9b-44c4-a9d7-239ede061fde)

- **Who:** @kepano — **Obsidian CEO himself** built this
- **What:** Plugin framework for turning the vault into a platform for building persistent, task-oriented AI agents. Called "the definitive tool for building AI agents inside Obsidian"

**Score: 9/10 conceptually**, but again plugin-first approach — runs in Obsidian not Claude Code. Different surface than ours.

---

### [Claudian](https://github.com/Enigmora/claudian)

- Obsidian plugin with Claude chat in side panel + Agent Mode to manage vault via natural language
- Similar to Obsidian AI Agent, different implementation

### [Obsidian Copilot](https://github.com/logancyang/obsidian-copilot)

- Mature, popular Obsidian plugin with Agent Mode + auto tool calling (vault search, web search)
- Different positioning: chat assistant INSIDE Obsidian, not autonomous background agent

### [claude-obsidian (Karpathy pattern)](https://github.com/AgriciDaniel/claude-obsidian)

- Claude + Obsidian knowledge companion explicitly based on **Karpathy's LLM Wiki pattern** — the same pattern that started this whole project for Adil
- `/wiki`, `/save`, `/autoresearch` commands

**Score: 8/10** — direct Karpathy-inspired, close to our philosophy

---

## Category 3 — CLI tools for GitHub trending (simpler primitives)

Not full agents, just raw sources for "what's trending on GitHub".

- [git-trend](https://github.com/manojkarthick/git-trend) — Python CLI, trending repos and developers
- [github-trending (evyatarmeged)](https://github.com/evyatarmeged/github-trending) — Node CLI
- [Trendshift](https://trendshift.io) — web UI for trending insights with better filtering than default

These are **data sources**, not agents. Useful as one input among many for a real research agent.

---

## Category 4 — Existing awesome-lists (curated pointers)

- [awesome-agents (kyrolabs)](https://github.com/kyrolabs/awesome-agents) — curated AI agents list
- [Awesome-Deep-Research (DavidZWZ)](https://github.com/DavidZWZ/Awesome-Deep-Research) — specifically deep research projects, up-to-date
- [Top 10 Agentic AI repos 2025 (ODSC)](https://opendatascience.com/the-top-ten-github-agentic-ai-repositories-in-2025/)

These are **meta-resources** — great for manual browsing to find more candidates without running an agent.

---

## Recommendation — what Adil should actually do

### Phase A — Adopt GPT Researcher as the research engine (next)

1. Install in a new isolated folder `C:\Users\User\Desktop\vault-research-agent\`
2. Configure with Adil's Gemini/OpenAI keys (each call stays in Adil's account, not OpenAI's)
3. Write a thin Python wrapper (~100 lines) that:
   - Reads `vault/projects/*/backlog.md` to extract research topics
   - Calls GPT Researcher for each topic
   - Takes the report, transforms into our card format
   - Deduplicates against `vault/research/library/` and existing `candidates/`
   - Writes cards to `vault/research/candidates/{date}-{slug}.md`
4. Schedule via `mcp__scheduled-tasks__create_scheduled_task` for 03:30 nightly

**Work estimate:** 2-4 hours. Much less than writing from scratch.

### Phase B — Evaluate obsidian-second-brain for the vault automation layer (later)

1. Read its SKILL.md thoroughly
2. Decide: fully adopt, partially adopt (steal scheduled-agents pattern), or ignore
3. If adopting partially: replicate the 4-agent schedule pattern with our own prompts targeted at our vault structure
4. Don't blindly replace our existing structure — we have working auto-load hooks, worklog, stop-reminder

**Work estimate:** 1-2 hours evaluation + ? hours adoption depending on fit.

### Phase C — NOT doing

- ❌ Writing a research agent from scratch
- ❌ Writing an RSS parser from scratch (News.AI's existing parser should probably be replaced with `rss-parser` or `feedparser` too — separate task)
- ❌ Using STORM or Tongyi (good but not the right fit)
- ❌ Installing a full Obsidian plugin (we want Claude Code surface, not Obsidian UI surface)

---

## Meta-lesson

Before building ANYTHING from scratch in the future:

1. **WebSearch** — one query in the right direction reveals 10 existing solutions
2. **Read top 2 READMEs** — 10 minutes each tells you if they fit
3. **Pick one to extend** — instead of starting from zero

This applies to the News.AI RSS parser (`rss-parser` npm package already exists, MIT, 3k stars), the content scraper, the template engine, the scheduled agents — all of these likely have pre-built solutions we can fork.

**New rule to add to project protocols:** when about to build something non-trivial, do a 10-minute WebSearch pass first. If a 10k-star MIT-licensed solution exists, fork it. Use the time saved to customize the thing properly.

---

## Sources

- [Tongyi DeepResearch](https://tongyi-agent.github.io/blog/introducing-tongyi-deep-research/)
- [LangChain Open Deep Research](https://github.com/langchain-ai/open_deep_research)
- [GPT Researcher](https://github.com/assafelovic/gpt-researcher)
- [Awesome Agents](https://github.com/kyrolabs/awesome-agents)
- [Top Ten GitHub Agentic AI Repositories 2025](https://opendatascience.com/the-top-ten-github-agentic-ai-repositories-in-2025/)
- [Awesome Deep Research](https://github.com/DavidZWZ/Awesome-Deep-Research)
- [GPT Researcher vs STORM discussion](https://github.com/assafelovic/gpt-researcher/discussions/999)
- [Obsidian AI Agent](https://github.com/m-rgba/obsidian-ai-agent)
- [Obsidian Second Brain](https://github.com/eugeniughelbur/obsidian-second-brain)
- [Obsidian Wiki (Karpathy pattern)](https://github.com/Ar9av/obsidian-wiki)
- [Obsidian Skills by kepano](https://www.opensourceprojects.dev/post/802e6bcf-1b9b-44c4-a9d7-239ede061fde)
- [Claudian](https://github.com/Enigmora/claudian)
- [Obsidian Copilot](https://github.com/logancyang/obsidian-copilot)
- [Claude-Obsidian (Karpathy)](https://github.com/AgriciDaniel/claude-obsidian)
- [git-trend CLI](https://github.com/manojkarthick/git-trend)
- [GitHub Trending (evyatarmeged)](https://github.com/evyatarmeged/github-trending)
- [Trendshift](https://trendshift.io)

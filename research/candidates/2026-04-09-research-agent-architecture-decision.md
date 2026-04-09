# Architecture decision: research agent as Claude Code skill, not Python project

**Date:** 2026-04-09
**Status:** Proposed, awaiting Adil's approval
**Author:** Claude (based on web research pass)

## TL;DR

We were about to build a Python project around `gpt-researcher` to power autonomous nightly research into Adil's vault. **Web research revealed a better path:** build it as a single Claude Code skill (markdown file), not as a Python project. Less code, no API costs beyond Adil's existing Claude Max subscription, easier to maintain, no infrastructure surface.

## Findings from research

### Finding 1 — ARIS shows pure-markdown skills work for autonomous research

[Auto-Research-In-Sleep (ARIS)](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep) is a 5.9k-star project that does autonomous overnight research using **only markdown skill files**, no framework, no database, no Docker. It runs as 31 SKILL.md files in `~/.claude/skills/` and is invoked by Claude Code.

ARIS specifically targets ML research (papers, experiments) but its **methodology** is directly applicable:
- "Methodology, not a platform" — composable markdown skills
- Cross-model review loop (one LLM does, another reviews)
- No vendor lock-in
- Plain text checkpoints
- Inline configuration via overrides

This validates: a pure-skill approach is real and works at scale.

### Finding 2 — gpt-researcher has friction for Adil's setup

[gpt-researcher](https://github.com/assafelovic/gpt-researcher) (26.3k stars) is the closest Python equivalent. From [its docs](https://docs.gptr.dev/docs/gpt-researcher/llms):

> "Anthropic does not offer its own embedding model, therefore, you'll want to either default to the OpenAI embedding model, or find another."

> "GPT Researcher is optimized and heavily tested on GPT models. Some other models might run into context limit errors, and unexpected responses."

For Adil, who plans to use Anthropic Claude as the primary LLM:
- Would still need an OpenAI key (or HuggingFace) for embeddings
- May hit edge cases with Claude (less tested path)
- Adds Tavily as the default search provider (~$5-30/mo depending on volume)
- Adds Python venv + dependencies + ongoing maintenance

### Finding 3 — defuddle solves clean web extraction

[kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) includes `defuddle` — "extract clean markdown from web pages, removing clutter to save tokens." This is exactly the preprocessing layer a research agent needs. Optional to install, free.

### Finding 4 — obsidian-second-brain validates the scheduled-agents pattern

[obsidian-second-brain](https://github.com/eugeniughelbur/obsidian-second-brain) has 4 scheduled agents (morning, nightly, weekly, health). MIT, layered on existing vaults. We're not adopting it directly, but it confirms: scheduled markdown-skill agents are a working pattern, not theory.

## The right architecture for Adil

### Option A — gpt-researcher Python project (originally proposed)

```
Desktop/vault-research-agent/   ← new repo
├── .venv/                       ← python venv
├── requirements.txt             ← gpt-researcher, langchain, etc.
├── .env                         ← OPENAI_API_KEY, ANTHROPIC_API_KEY, TAVILY_API_KEY
├── src/
│   ├── read_backlogs.py
│   ├── dedupe.py
│   ├── format_card.py
│   ├── write_to_vault.py
│   └── run.py
└── README.md
```

**Costs:**
- Tavily ~$5-30/month
- OpenAI embeddings ~$1-5/month (small)
- Setup time: 2-3 hours
- Maintenance: pip updates, dependency conflicts, occasional gpt-researcher API changes

**Pros:** mature library, large community, battle-tested
**Cons:** heavy stack, Anthropic-Claude friction, ongoing $/maintenance, separate codebase to maintain

### Option B — Claude Code skill (recommended)

```
~/.claude/skills/vault-research-agent/
└── SKILL.md                     ← single markdown file (~200 lines)
```

**Costs:**
- Search: $0 (built-in WebSearch in Claude Code)
- Page fetch: $0 (built-in WebFetch)
- LLM: $0 incremental (uses Adil's existing Claude Max subscription)
- Setup time: ~30 minutes
- Maintenance: edit one markdown file when needed

**Tools the skill uses (all built-in to Claude Code):**
- `WebSearch` — find candidate repos
- `WebFetch` — read README + GitHub project pages
- `Read` — vault files (backlogs, library indexes, existing candidates)
- `Write` — new candidate cards + run reports
- `Bash` — `git log` on Adil's projects (for context awareness)

**Pros:**
- Zero new infrastructure
- Reuses everything we already built (vault, hooks, scheduled-tasks)
- One file to maintain
- No new API keys
- No Python deps
- Inherits Adil's Claude Max billing (no incremental cost)

**Cons:**
- Less mature than gpt-researcher (we write the prompts ourselves)
- WebSearch quality depends on Claude Code's built-in search
- No fancy features like streaming reports, multi-agent planner+executor

**Trade-off verdict:** the cons matter less because our use case is **simpler than what gpt-researcher solves**. We don't need 2000-word reports with citations — we need short cards (~50 lines) about specific tools. A skill is more than enough for this.

## Recommended decision

**Build Option B — a Claude Code skill at `~/.claude/skills/vault-research-agent/`.**

If after 2-3 weeks of running it nightly we find quality is insufficient, we can revisit by:
1. Adding `defuddle` skill for cleaner page extraction
2. Adding cross-model review (have GPT-4 review Claude's research output)
3. Falling back to gpt-researcher Python project if the skill approach plateaus

This keeps optionality. We're not closing the door on the heavier path — just not paying for it before we know we need it.

## Implementation plan if approved

### Phase 1 — Write the SKILL.md (~30 min)
1. Create `~/.claude/skills/vault-research-agent/SKILL.md`
2. Write the autonomous research prompt with all the steps:
   - Read vault backlogs + gotchas + library index
   - Formulate 5-7 search queries based on real project needs
   - WebSearch each, get top candidates
   - WebFetch READMEs, extract metadata
   - Dedupe against existing library/ and candidates/
   - Score each, write detailed cards for high-scorers
   - Write run report
3. Include hard rules: only write to `vault/research/`, never touch projects, never `git push`, max N searches per run (cost cap)

### Phase 2 — Schedule it (~5 min)
1. Use `mcp__scheduled-tasks__create_scheduled_task` to create `vault-nightly-research`
2. Schedule: daily at 03:03 (30 minutes BEFORE the synth agent at 03:33, so they don't collide)
3. The task prompt is short: "Run the vault-research-agent skill"

### Phase 3 — Manual test run (~15 min)
1. Trigger the task manually once
2. Watch what it produces
3. Refine the SKILL.md based on real output (e.g., it found junk → tighten the score threshold; it missed something → adjust queries)

### Phase 4 — Tune over time (~ongoing)
1. After each nightly run, Adil checks `vault/research/candidates/` in the morning
2. Promotes good cards to `vault/research/library/` (manually or via Claude command)
3. Notes false positives → adjusts SKILL.md filters
4. After 1 week, the skill should be stable

## What we're NOT doing

- ❌ Building a Python project
- ❌ Installing gpt-researcher
- ❌ Paying for Tavily API
- ❌ Adding new API keys to Adil's environment
- ❌ Creating a new repo
- ❌ Auto-cloning or auto-installing any external packages
- ❌ Letting the agent touch project code

## Sources

- [ARIS — Auto-Research-In-Sleep](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep)
- [gpt-researcher GitHub](https://github.com/assafelovic/gpt-researcher)
- [gpt-researcher LLM docs](https://docs.gptr.dev/docs/gpt-researcher/llms)
- [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)
- [obsidian-second-brain](https://github.com/eugeniughelbur/obsidian-second-brain)
- [Backlog.md](https://github.com/MrLesk/Backlog.md)
- [AutoResearchClaw](https://github.com/aiming-lab/AutoResearchClaw)
- [How to Build an AI Second Brain — MindStudio](https://www.mindstudio.ai/blog/build-ai-second-brain-claude-code-obsidian)

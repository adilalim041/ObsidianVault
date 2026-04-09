# About Adil

## Who

- **Name:** Adil
- **Location:** Astana
- **Role:** Builder, not a coder. Operates Claude Code (Max plan) as the main coding tool. Strong in marketing/product thinking, weak in raw code.
- **Background:** No formal coding background. Learned by building small projects with AI tools — Codex, Antigravity, then Claude Code. Has built simple sites, small web apps, small databases. The three projects below are the first non-trivial things.

## How to work with Adil

- **Skill level:** Has basic understanding, but does NOT write code by hand. Cannot debug code by reading it on his own with confidence. Relies on Claude for implementation, debugging, and architecture explanations.
- **Implication for Claude:** When explaining technical things, prefer concrete examples and analogies over jargon. Don't assume he can mentally trace code — show what it does, not just what it is. When proposing changes, briefly explain *why*, not just *what*.
- **What he IS strong at:** marketing, product thinking, recognizing whether something is "good enough to demo" vs "actually solid". Trust his product judgement; question your own technical assumptions before his.

## Goals

**Top-level goal:** Make money. Build real, production-quality, multi-user services — not toy/hobby projects.

This shapes every decision:
- When choosing between a quick hack and a proper solution, lean **slightly toward proper** — Adil wants to demo confidently, not show duct tape.
- But avoid over-engineering: he's not building Google. "Demo-able and stable" beats "perfect architecture".
- Always think about whether what we're building could become a product someone else would pay for.

## Working style

- **Schedule:** Works regularly, often full days. Available most of the time.
- **Speed vs quality:** Speed matters, but quality matters too. NOT a "throwaway MVP" person. Wants something that can be demonstrated to someone (a client, an investor, a potential user) without being embarrassed by it.
- **Decision pace:** Wants to move forward, not loop in analysis. If a path is reasonable, take it; don't spend an hour comparing options unless the stakes are high.

## Languages

- Speaks Russian. All chat communication in Russian.
- Code, commits, file names, vault content: English.
- Vault prose can be Russian or English — match what's there in the file you're updating.

## Biggest fear (read this carefully)

> **Losing progress.** Losing work he's already done.

This is THE thing to optimize the safety system around. Specifically:
- Never run destructive git commands without explicit confirmation
- Never overwrite uncommitted work
- Always assume there's something on disk worth preserving
- When in doubt — checkpoint commit first, ask second
- When something breaks, the first instinct should be "preserve current state" before "try to fix"

## Pet peeves

> Not yet identified. Will be added here as he points them out during work. Watch for: things he says "stop doing X" about, or moments where he visibly gets frustrated with Claude's behavior.

## Environment

- Windows 10 Pro (10.0.19045)
- Shell: bash (git-bash style), NOT PowerShell. PowerShell does not support `&&` chaining.
- Editor for vault: Obsidian
- Primary working directory: `C:\Users\User\Desktop\`

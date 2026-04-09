# Library — vetted tools, libs, and assets

> This is **not** the autonomous research agent's output. This is a hand-curated library of well-known, production-grade tools that Claude (and Adil) can pull from when building features. Every entry here is:
>
> - **Permissively licensed** (MIT / Apache / BSD / CC0) — usable in commercial products
> - **Battle-tested** in real production by many teams
> - **Useful for at least one of Adil's three projects**
>
> Nothing in this library was found by an automated crawler. Everything here is known-good as of 2026-04-07.

## Why this library exists

When Claude builds a feature from scratch in its "sandbox", it tends to hand-roll basic UI (boxes, circles, plain forms) because it has no asset library to pull from. This `library/` solves that — instead of "draw a button", Claude can read the relevant card here and copy a real component from a real library.

**Workflow:** when you ask Claude for a new feature, the first step is to check this library for existing solutions. Reuse > rebuild.

## Categories

- [ui-components/](ui-components/_index.md) — React component libraries (shadcn, Radix, Tremor, etc.)
- [assets/](assets/_index.md) — Icons, illustrations, fonts, game assets — free for commercial use
- [backend-libs/](backend-libs/_index.md) — Production Node libraries (retry, queues, logging, validation, ORMs)
- [ai-libs/](ai-libs/_index.md) — AI SDKs and abstractions (multi-provider, structured output)
- [python-libs/](python-libs/_index.md) — Python ecosystem (mostly for Nexus.AI)

## How to read a card

Every card has the same structure:
- **What it is** — one paragraph
- **License** — confirm it's commercially safe
- **Used for** — which Adil project(s)
- **Why it's better than alternatives** — the actual selling point
- **How to use** — install command + minimal code example
- **Score** — Claude's honest rating 1-10 for Adil's specific needs
- **Alternatives** — 2-3 similar tools to know about
- **Risks** — what to watch out for

## How to add to this library

Manually, after vetting. **No autonomous additions.** When you discover a new tool that's clearly production-grade and useful, add a card here. If unsure — put it in `candidates/` first (separate folder for "maybe", different from `library/` for "yes").

# Deep Studies — full code analysis of real repositories

> This folder contains **deep analysis** of repos found by the nightly parser.
> Unlike `candidates/` (surface-level cards), studies contain line-by-line code analysis
> with reusable patterns, architecture breakdowns, and concrete code snippets.

## How studies are created

1. Nightly parser finds repos → writes cards to `candidates/`
2. During daytime Claude Code sessions, Adil says "study X" or "study top 5"
3. Subagents (frontend-dev, backend-dev, integrations-dev) clone the repo and analyze every file
4. Each subagent writes their domain analysis + extracts reusable patterns
5. 3-pass quality check ensures completeness

## Folder structure

Each studied repo gets its own folder: `YYYY-MM-DD-owner-repo/`

| File | Written by | Contents |
|------|-----------|----------|
| `overview.md` | Orchestrator | Architecture, stack, file map, quality scores, relevance to Adil's projects |
| `frontend.md` | frontend-dev | Every React/Vue component, state management, styling, routing patterns |
| `backend.md` | backend-dev | API routes, middleware, DB schemas, auth, error handling |
| `infra.md` | integrations-dev | Docker, CI/CD, deployment, env management |
| `patterns.md` | Orchestrator (synthesized) | Ready-to-use code patterns with adaptation notes |
| `verdict.md` | Orchestrator | Final recommendation: adopt/watch/skip + action items |

## Study status on candidate cards

- `**Status:** found` — parser found it, basic card only
- `**Status:** studied` — subagents did deep analysis, study folder exists
- `**Status:** applied` — patterns from study used in a real project

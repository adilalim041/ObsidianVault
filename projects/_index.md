# Projects — Index

| Project | Status | Stack | Path on disk | Vault folder |
|---|---|---|---|---|
| **Omoikiri.AI** | Active | Node + Supabase + WhatsApp + React | `C:\Users\User\Desktop\wa-bridge\` | [omoikiri/](omoikiri/_index.md) |
| **News.AI** | Active | Multi-service Node + Python on Railway | `C:\Users\User\Desktop\news-project\` | [news-ai/](news-ai/_index.md) |
| **Nexus.AI** | Experimental | Python assistant + memory + media gen | `C:\Users\User\.gemini\antigravity\playground\ionized-shepard\AbdAdl\` | [nexus-ai/](nexus-ai/_index.md) |

## Rules

- **Project nodes** are project-specific. They name the project, list its real paths, describe its actual architecture.
- **Knowledge nodes** ([../knowledge/](../knowledge/_index.md)) are project-agnostic. They never say "in News.AI we do X". They say "pattern X is used when Y".
- When applying a knowledge node to a project, **read the project's `architecture.md` first** to make sure the pattern fits.

## Each project folder contains

- `_index.md` — quick reference: project name, path, status, key URLs (no secrets)
- `overview.md` — what it does, who it's for, current state
- `architecture.md` — how it's built. Has a `Last verified:` date.
- `decisions.md` — important choices and *why*, in ADR style
- `gotchas.md` — things that bit us, things to remember
- `backlog.md` — what's next

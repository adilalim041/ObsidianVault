# Knowledge — Index

> Project-agnostic knowledge. Never says "in News.AI we do X" — that goes in `projects/`.
> When applying a knowledge node to a project, read the project's `architecture.md` first.

## Areas

- [Frontend](frontend/_index.md) — React, Vite, Tailwind, Fabric.js, UI patterns
- [Backend](backend/_index.md) — Supabase, Postgres, Node, Express, Python
- [Integrations](integrations/_index.md) — Railway, Telegram, Meta Graph, OpenAI, Cloudinary
- [Design](design/_index.md) — UI principles, color systems, layout
- [DevOps](devops/_index.md) — CI/CD, secrets management, deployment

## How knowledge nodes work

- One file = one topic. Max ~300 lines.
- File names are kebab-case English: `supabase-rls-patterns.md`, not `notes_supabase.md`.
- Update **in place** when you learn more. Don't append a date and add to the bottom — restructure the node.
- If a pattern only ever applied to one project, it doesn't belong here. Move it to `projects/{name}/decisions.md`.
- If a node grows past ~300 lines, split it: e.g. `supabase.md` → `supabase-rls.md` + `supabase-edge-functions.md` + `supabase-storage.md`.

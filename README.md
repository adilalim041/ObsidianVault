# ObsidianVault — Adil's persistent knowledge base

This is **the brain** that Claude reads before working and updates after working. It is also a vault you can open in Obsidian to see the graph of your projects, tools, and accumulated experience.

## How to open in Obsidian

1. Open Obsidian
2. "Open folder as vault"
3. Select `C:\Users\User\Desktop\ObsidianVault\`
4. The graph view will show how knowledge nodes connect.

## Structure

```
ObsidianVault/
  README.md           ← you are here
  SECURITY.md         ← what is secret, what is forbidden
  index.md            ← map of the whole vault
  about-me.md         ← about Adil (style, stack, preferences)

  projects/           ← what we are building
    _index.md
    omoikiri/         ← Omoikiri.AI / wa-bridge
    news-ai/          ← News.AI / news-project
    nexus-ai/         ← Nexus.AI / AbdAdl

  knowledge/          ← how we build it (general, no project names)
    frontend/
    backend/
    integrations/
    design/
    devops/

  patterns/           ← cross-domain principles

  incidents/          ← bug post-mortems with dates

  research/           ← night research agent's playground (future)
```

## Rules in one paragraph

Knowledge nodes (`knowledge/`, `patterns/`) describe things **in general**, without project names. Project nodes (`projects/{name}/`) describe **specific** projects. When you learn something reusable, update an existing node **in place**, do not create duplicates. Never write secrets — see SECURITY.md. Code is the source of truth; the vault is the compass. Each architecture node has a `Last verified:` date — if it's old and you depend on it, re-check the code first.

## Conventions

- **Links:** use relative markdown links `[text](../knowledge/backend/supabase-rls.md)` for portability. Obsidian-style `[[wikilinks]]` also work in Obsidian, but plain links work everywhere.
- **Dates:** YYYY-MM-DD always. Never relative.
- **Languages:** content in Russian or English, match what's there. File names always English, kebab-case.
- **One topic per file.** Max ~300 lines.
- **`_index.md`** in every folder is the table of contents for that folder, so Claude doesn't have to read every file.

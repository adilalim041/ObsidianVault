# Research — Index

## Subfolders

### 📚 library/  — **Hand-curated, vetted, ready to use**

The library is the **first place to look** before building any new feature. Every entry here is production-grade, permissively licensed, and recommended for at least one of Adil's projects.

- [library/_index.md](library/_index.md) — start here
- [library/ui-components/](library/ui-components/_index.md) — shadcn, Radix, Tremor, TanStack Table, Mantine
- [library/assets/](library/assets/_index.md) — Lucide, Phosphor, Heroicons, Tabler, unDraw, Storyset, Google Fonts, Kenney
- [library/backend-libs/](library/backend-libs/_index.md) — p-retry, p-queue, BullMQ, graphile-worker, Pino, Zod, Drizzle, Sharp
- [library/ai-libs/](library/ai-libs/_index.md) — LiteLLM, Vercel AI SDK, instructor-js, OpenAI/Anthropic/Gemini SDKs, retry-and-fallback pattern
- [library/python-libs/](library/python-libs/_index.md) — aiogram, PyAutoGUI, pywinauto, ChromaDB, LanceDB, Ollama, smolagents, faster-whisper, Piper TTS, instructor

**Workflow:** when you ask Claude for a new feature, the first step is to check this library. If a card exists for the problem, **use it** instead of rebuilding from scratch. Stop drawing boxes and circles.

### 🤖 candidates/ — *(empty for now)*

Where the future autonomous research agent will drop new GitHub findings for review. Currently inactive.

### 🧪 tested/ — *(empty for now)*

Where vetted candidates will go after manual approval and testing.

### ✅ integrated/ — *(empty for now)*

Where successfully adopted tools graduate to. From here they may be promoted to `library/` proper or referenced in `knowledge/` patterns.

## What's NOT in research

- **Real secrets** — never. The vault hook blocks them.
- **Random unverified GitHub repos** — those go to `candidates/`, not `library/`.
- **Project-specific code** — that lives in the projects themselves, not here.

## Constraints when (and if) the autonomous agent is activated

- Write access **only** to `vault/research/`
- No `npm install` / `pip install` of arbitrary packages without manual approval
- No git push, no remote operations
- No access to project `.env` files
- Reads README + WebSearch only — does not execute foreign code
- Outputs proposals → Adil approves → only then does any clone/install happen

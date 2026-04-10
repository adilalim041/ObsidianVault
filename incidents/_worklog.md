# Worklog — automatic commit activity log

> This file is populated **automatically** by git post-commit hooks installed in each project (`wa-bridge`, `news-project`, `AbdAdl`). Every git commit writes one line here. This is a **raw journal**, not curated knowledge.
>
> - Purpose: give the night research agent + future Claude sessions a reliable, mechanical record of what happened and when.
> - Newest entries at top.
> - Format: `` `YYYY-MM-DD HH:MM` | **project** | `hash` (branch) | commit message ``
> - Secret-scan hook does NOT apply here — this file is written by git hooks, not by Claude's Write tool.
>
> If you see no entries below the `---` line, it means no commits have been made since the hooks were installed, or the hooks aren't working. To test: make a commit in any project and refresh this file.

---

`2026-04-10 11:54` | **AbdAdl** | `23ace6b` (main) | feat: migrate Nexus memory from SQLite to Supabase

`2026-04-10 02:06` | **AbdAdl** | `b7fdc5d` (main) | feat: add dashboard link button in vault menu

`2026-04-10 00:58` | **AbdAdl** | `0c354a8` (main) | feat: show last parser run date/time in vault status

`2026-04-10 00:41` | **AbdAdl** | `608bc5e` (main) | fix: configurable Gemini model via GEMINI_MODEL env var

`2026-04-10 00:39` | **AbdAdl** | `3cefb9c` (main) | fix: parse_intent_payload crash when payload is list instead of dict

`2026-04-10 00:35` | **AbdAdl** | `14d126d` (main) | fix: 5 bugs found in final audit

`2026-04-10 00:29` | **AbdAdl** | `68160ee` (main) | fix: full Gemini-compatible normalization for Claude fallback

`2026-04-10 00:29` | **news-project** | `aa589ba` (main) | feat: shadcn/ui dashboard + brain article actions

`2026-04-10 00:26` | **AbdAdl** | `9370cb7` (main) | fix: Claude fallback compatibility for reminders + vault Q&A formatting

`2026-04-10 00:22` | **AbdAdl** | `cdcc97d` (main) | fix: Anthropic fallback now properly parses nested JSON responses

`2026-04-10 00:09` | **AbdAdl** | `fc6e846` (main) | feat: Anthropic Claude fallback when Gemini returns 403

`2026-04-09 23:56` | **AbdAdl** | `b402b0e` (main) | feat: smart vault Q&A + fix Markdown crashes in vault buttons

`2026-04-09 23:46` | **AbdAdl** | `7ba6310` (main) | fix: strip newlines from VAULT_REPO_URL (Railway injects trailing newline)

`2026-04-09 23:33` | **AbdAdl** | `75eaf06` (main) | improve: vault cards always show descriptions now

`2026-04-09 23:09` | **AbdAdl** | `f7f8e24` (main) | fix: runtime_guard type hint crash when psutil not installed (Railway)

`2026-04-09 23:00` | **news-project** | `dbd0c37` (main) | feat: dashboard React migration + brain browse endpoints

`2026-04-09 22:55` | **AbdAdl** | `f06cc76` (main) | improve: vault cards now show descriptions and target project

`2026-04-09 22:50` | **AbdAdl** | `da3e237` (main) | feat: Railway cloud deployment support

`2026-04-09 22:44` | **AbdAdl** | `44d76d6` (main) | feat: add Vault button to dashboard menu

`2026-04-09 22:40` | **AbdAdl** | `c4db0bb` (main) | fix: runtime_guard process scan was too aggressive

`2026-04-09 22:24` | **AbdAdl** | `3fc5426` (main) | refactor: split bot.py monolith (2400 lines) into 10 modular files

`2026-04-09 21:56` | **AbdAdl** | `b7313e3` (main) | security: RPA computer_use now requires confirmation per step

`2026-04-09 21:51` | **AbdAdl** | `a4af4b6` (main) | fix: comprehensive security + stability audit — 22 issues resolved

`2026-04-09 21:40` | **news-project** | `83c5867` (main) | feat: p-retry + p-queue + structured logging across brain, generator, publisher

`2026-04-09 18:44` | **wa-bridge** | `43b41de` (main) | fix: WS timing-safe auth + dialog link retry 3 attempts

`2026-04-09 18:36` | **wa-bridge** | `a5d92ef` (main) | feat: real Omoikiri product catalog + contacts __all__ mode

`2026-04-09 18:12` | **wa-bridge** | `73d9d17` (main) | fix: unique browser fingerprint per WhatsApp session (anti-ban)

`2026-04-09 17:37` | **wa-bridge** | `16464ca` (main) | fix: clear stale session locks on startup (Railway redeploy fix)

`2026-04-09 17:14` | **wa-bridge** | `bcf37f5` (main) | feat: production readiness for 8 WA accounts — full hardening

`2026-04-09 00:39` | **news-project** | `62089f2` (main) | test: verify worklog hook from news-project

`2026-04-09 00:18` | **AbdAdl** | `85a9071` (main) | initial commit: project state before vault setup

`2026-04-09 00:18` | **news-project** | `e6c1f64` (main) | initial commit: project state before vault setup

`2026-04-09 00:18` | **wa-bridge** | `179e299` (main) | checkpoint: safety snapshot before vault setup

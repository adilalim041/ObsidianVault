# Structure Scanner — Learnings

> Auto-updated after each run.

---

## 2026-04-09
- When a repo has 237 frontend files but only 10 index/config files, it's likely a published component library rather than an app—look for src/index.ts as the barrel export and .storybook config as the primary dev tool.

## 2026-04-09
- The presence of extensive assets (icons in .tsx), comprehensive tests (44 test files), and Storybook setup indicates a mature, well-documented UI library focused on component quality and reusability.

## 2026-04-09
- Tailwind + Tremor-specific merge utility (tremorTwMerge.ts) suggests theme customization via CSS class merging—worth examining for styling patterns.

## 2026-04-09
- This is a Python backend library organized by domain (STT, LLM, TTS) with each module having its own README—suggests a multi-pipeline architecture where subagents should analyze each domain separately for dependencies and handlers.

## 2026-04-09
- Presence of OpenAI Realtime API integration (websocket_router, realtime_service) indicates this repo bridges local ML models with cloud APIs—worth examining for streaming patterns and protocol handling.

## 2026-04-09
- Dual Dockerfile setup (standard + ARM64) suggests this is deployed to edge/embedded devices—infra analysis should prioritize resource constraints and model quantization options.

## 2026-04-09
- pg-boss is a PostgreSQL-backed job queue system organized as a monorepo with three main concerns (core library, proxy/API wrapper, React dashboard)—subagents should analyze src/boss.ts for queue mechanics and database schema, packages/proxy for HTTP/WebSocket protocol handling, and dashboard for real-time monitoring patterns.

## 2026-04-09
- The presence of both `src/cli.ts` and `packages/dashboard/app/app.tsx` as entry points suggests this project supports multiple consumption patterns (CLI tool, library import, and web UI)—critical for understanding the testing and deployment strategy.

## 2026-04-09
- 77 test files across frontend (badge, breadcrumbs, forms) and likely backend (job scheduling, queue management) indicates strong test coverage—worth examining test organization to identify gaps between unit/integration/e2e boundaries.

## 2026-04-09
- A Python backend with 0 frontend files but 5 test files and structured provider/service modules suggests a headless API service or SDK library—prioritize analyzing `providers/base.py` and `providers/registry.py` for the abstraction pattern, and `main.py` for HTTP endpoint setup and routing logic.

## 2026-04-09
- The presence of `providers.json` as a config file (separate from pyproject.toml) indicates dynamic provider configuration—subagents should examine both the schema of this file and how `providers/registry.py` loads it to understand extensibility patterns.

## 2026-04-09
- Multi-provider abstraction (Anthropic, Gemini, Ollama, OpenAI-compatible) with dual services (LLM + embedding) suggests this gateway normalizes different model APIs into a single interface—test coverage should reveal which providers have the most implementation complexity.

## 2026-04-09
- OpenMMLab research framework repositories follow a task-domain-oriented structure (configs/{task_name}/ with corresponding model implementations)—prioritize analyzing task-specific README files and API modules to understand the abstraction layer across different computer vision tasks.

## 2026-04-09
- Heavy presence of .dev_scripts/ utilities (download_models.py, train_benchmark.py, update_model_index.py) indicates this is a model distribution and benchmarking framework—subagents should examine registry/indexing mechanisms and how models are downloaded/cached locally.

## 2026-04-09
- 97 documentation files with model-specific READMEs but only 16 test files suggests this is a published model zoo where documentation completeness is prioritized over unit test coverage—focus analysis on config schema consistency and API stability rather than test coverage gaps.

## 2026-04-09
- pg-boss is a PostgreSQL job queue with three independent consumption patterns (library, CLI, proxy API)—each has separate entry points but shares src/boss.ts as the unified core; test subagents should verify contracts between layers and WebSocket protocol stability for real-time dashboard updates.

## 2026-04-09
- The presence of packages/proxy/ as a dedicated HTTP/WebSocket bridge suggests architectural separation between job engine (src/) and API surface (packages/proxy/)—this enables headless operation and multi-client monitoring; infra analysis should examine how proxy handles database reconnection and backpressure.

## 2026-04-09
- 45 frontend files concentrated in packages/dashboard/ with Vite + React Router suggests a separate build/deploy pipeline for the dashboard—check .github/workflows/dashboard.yml and publish-dashboard.yml for independent versioning and release cadence from the core library.

## 2026-04-09
- Component libraries (UI kits) have 80%+ of files as frontend assets/icons/stories, with minimal "backend" presence—false positives occur when classifying utility modules and type definition files; prioritize .storybook/ config and src/stories/ for understanding component API surface.

## 2026-04-09
- 44 test files in a 331-file UI kit (13% test ratio) with per-component test files indicates strong testing discipline for visual/interactive components—test subagents should focus on snapshot testing strategy and accessibility (a11y) coverage across form and chart elements.

## 2026-04-09
- Go API gateway projects with pluggable provider patterns should have subagents examine both the abstract provider interface (internal/provider/provider.go) and provider-specific implementations (likely in internal/provider/{vendor}/) to understand extensibility constraints and failover behavior (e.g

## 2026-04-09
- High error type diversity (9+ custom error types) in internal/errors/ is a signal that the service implements granular policy enforcement—subagents should map each error type to corresponding policy checks and API response codes to understand rate limiting and cost control mechanics.

## 2026-04-09
- Go services with Kubernetes + Helm + multiple Dockerfile variants indicate multi-environment deployment complexity—infra subagents should verify if image tagging strategy (tag per environment vs. single image) and config injection (env vars vs. ConfigMap vs. Secret) are consistent across dev/prod.

## 2026-04-09
- RSS/feed parser libraries achieve 80%+ test file ratio through fixture-based testing (real-world feed samples in test/input/) rather than unit tests—focus subagent analysis on feed format variance handling and field normalization logic (lib/fields.js) rather than traditional unit test coverage metri

## 2026-04-09
- Dual-target JavaScript libraries (Node.js + browser) require cross-platform build validation—check webpack output alongside npm package entry point; verify index.js is truly isomorphic or if separate browser entry exists.

## 2026-04-09
- Presence of both .travis.yml and GitHub Actions workflows with no git commit dates visible suggests CI migration in progress—subagents should verify which workflow is actively used before making assumptions about CI/CD behavior.

## 2026-04-09
- Python MCP (Model Context Protocol) packages typically follow a dual-interface pattern (server.py + client.py) where one implements the protocol server and the other provides a convenience client wrapper—both should be analyzed together to understand bidirectional message handling.

## 2026-04-09
- Presence of mcp_server_config_demo.json in a Python library root signals that config schema and example instantiation are critical documentation artifacts—subagents should validate that the JSON schema matches actual Config/Settings dataclasses in the code.

## 2026-04-09
- Small Python packages (20–50 files) with scripts/ directory containing build.sh, dev.sh, deploy.sh, test.sh typically indicate a published library with strong DevOps practices—check if these scripts use poetry/pip/setuptools and whether they gate on test passes before deployment.

## 2026-04-09
- Python monoliths with embedded NLTK data + Streamlit UI typically separate into webui_pages/ (UI component logic) and server/ (API/business logic)—analyze Streamlit session state management and FastAPI route structure separately for frontend/backend patterns.

## 2026-04-09
- Workspace with _test.yml, _integration_test.yml, and _test_release.yml workflow files suggests comprehensive CI strategy (unit → integration → release candidate testing); subagents should verify test coverage across all three stages rather than assuming single test suite.

## 2026-04-09
- Presence of dual package structure (app + SDK) with shared core logic indicates the main.py or cli.py entry point likely imports from a common backend module—subagents should trace SDK imports to identify the true architectural boundary between "deployable service" and "reusable library."

## 2026-04-09
- Speech-to-speech inference pipelines with OpenAI Realtime API integration commonly use handler abstraction (STT_Handler, LLM_Handler, TTS_Handler base classes) to support runtime engine switching—subagents should verify that each handler respects a callback/async interface and that the orchestrator 

## 2026-04-09
- Multi-architecture Docker support (Dockerfile + Dockerfile.arm64) in inference services signals deployment to edge devices (M1/M2 Macs, ARM servers); subagents should validate that build context is identical and that runtime dependencies (model weights, CUDA vs. CPU fallbacks) are consistently resol

## 2026-04-09
- Presence of runtime_config.py as a test file (alongside pyproject.toml config) suggests the service uses a Settings/Config dataclass pattern for dependency injection; subagents should verify that environment variable mapping is exhaustive and that config validation fails fast at startup rather than 

## 2026-04-09
- TypeScript monorepos with optional "companion" packages (dashboard, proxy) in a packages/ directory typically have a core library entry point (src/boss.ts) that is imported by all companions—subagents should verify that dashboard/proxy are purely UI/gateway wrappers rather than alternative implement

## 2026-04-09
- Presence of separate GitHub Actions workflows per package (ci.yml, dashboard.yml, proxy.yml, publish-dashboard.yml, publish-proxy.yml) alongside a monorepo structure indicates independent versioning/publishing—subagents should check package.json files for workspace configuration and verify whether v

## 2026-04-09
- Job queue libraries (like pg-boss) with both CLI (src/cli.ts) and library (src/boss.ts) entry points typically expose a dual-interface pattern; the proxy/ package suggests REST-over-HTTP capability was added later as an optional deployment topology—subagents should verify whether the proxy merely wr

## 2026-04-09
- Minimal Node.js integration projects (WhatsApp + OpenAI bridges) typically use a flat structure with a single entry point (index.js), message abstraction layer (lib/messages.js), and credential file (key.json); lack of tests/infra suggests these are often proof-of-concept or personal automation tool

## 2026-04-09
- Presence of key.json in repo root is a security anti-pattern; subagents should flag this and recommend .env + .gitignore exclusion before analyzing the actual bot logic.

## 2026-04-09
- WhatsApp bot repositories (Baileys MD variants) follow a consistent plugin-loader pattern where `index.js` initializes the Baileys socket, `handler.js` routes incoming messages to plugin files, and `config.js` + `.env` manage bot settings/credentials—subagents analyzing these should prioritize verif

## 2026-04-09
- Presence of both `config.js` and `.env` in a Node.js bot suggests dual-layer configuration (static defaults + runtime secrets); subagents should flag if `.env` is tracked in git and verify that sensitive fields (session tokens, API keys) are never hardcoded in config.js or plugins.

## 2026-04-09
- Minimal/missing test and infra directories in WhatsApp bot repos is typical for hobby/personal-automation projects; this signals that code quality gates (linting, unit tests, Docker packaging) may not be enforced—subagents should note this when assessing deployment readiness.

## 2026-04-09
- Python Langchain-based projects with `webui_pages/` directories use Streamlit for frontend; the dual-layer structure (CLI entry + API server + webui) suggests the service supports both programmatic (SDK) and interactive (web) interfaces—subagents should verify that the Streamlit pages are properly i

## 2026-04-09
- Presence of `.env` at repo root alongside `pyproject.toml` in a monorepo with `libs/` subdirectories indicates shared environment configuration; subagents should check whether `.env` is gitignored and whether each `libs/*/` subdirectory (chatchat-server, python-sdk) has its own dotenv loading logic 

## 2026-04-09
- NLTK data bundled directly in `chatchat/data/nltk_data/` (cmudict, tokenizers, taggers) suggests heavy NLP preprocessing pipeline; subagents should verify whether this bloats Docker images and whether lazy-loading or external data fetching is feasible for text segmentation/tokenization tasks.

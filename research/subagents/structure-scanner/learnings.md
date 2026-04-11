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

## 2026-04-09
- Fern API definitions (fern/apis/server/definition/*.yml) in a monorepo are the contract source; subagents analyzing backend changes should check whether the Fern definitions are updated before generated SDKs/OpenAPI specs are regenerated.

## 2026-04-09
- Presence of both web/ (Next.js) and packages/shared/ (SDK) with separate tsconfig.json files indicates a dual-interface pattern—the shared package is both an internal library and a published npm package; subagents should verify exports in packages/shared/package.json align with public API surface.

## 2026-04-09
- EE module isolation (ee/ directory with separate package.json and tsconfig) alongside fern API definitions suggests license checks are applied at API level; subagents should trace where ee-license-check/index.ts is invoked in the request pipeline.

## 2026-04-09
- Presence of .env.*.example variants (dev, prod, azure, redis-cluster) indicates the deployment topology is flexible and environment-aware; subagents should cross-reference these with docker-compose.yml and GitHub Actions workflows to understand how config is injected in each stage.

## 2026-04-09
- Nuxt 3 monoliths with Directus CMS integration typically organize Directus-specific logic in a `.directus/` directory (docker-compose, run-scripts for database hooks, schema validation); subagents analyzing database-layer changes should prioritize files in `.directus/run-scripts/` alongside server A

## 2026-04-09
- Presence of layered subsystems (layers/portal/, layers/proposals/) with separate README.md files indicates feature-based module organization within a Nuxt monolith; each layer likely has isolated API endpoints and should be analyzed for shared state/schema conflicts.

## 2026-04-09
- Stripe integration concentrated in `layers/portal/server/api/stripe/` with webhook handling suggests billing/subscription logic is compartmentalized; subagents reviewing payment flows should verify webhook signature validation and idempotency handling in webhooks.post.ts.

## 2026-04-09
- Minimal test files (3 found, mostly type definitions) combined with linting/typecheck GitHub Actions (no test.yaml workflow) indicates this is a content/marketing-focused CMS project prioritizing type safety over unit tests; deployment readiness may depend on manual QA rather than automated test gat

## 2026-04-09
- Node.js monoliths with separate `src/` backend modules and minimal `public/` static frontend, combined with `.npmrelease` + `.github/workflows/` patterns, indicate a published CLI tool or daemon package with embedded HTTP server; prioritize src/index.js and src/app.js as entry points.

## 2026-04-09
- Presence of `test-injection.html` alongside modular backend files (highlighter.js, gem-highlighter.js) suggests dynamic content injection or browser extension testing; subagents should check whether this is used for DOM manipulation or XSS testing scenarios.

## 2026-04-09
- High unclassified file count (36 of 68) with names like `.npmignore`, `.npmrelease`, `.npm.release`, and `exec.js` indicates npm tooling cruft and shell utilities; verify these against .gitignore to avoid analyzing artifacts as source code.

## 2026-04-10
- Monorepos with `.changeset/` directory + `.github/changeset-version.js` use automated changelog and version management; subagents analyzing release workflows should prioritize .changeset/config.json and release.yml to understand the publish pipeline and coordination between multiple apps/ packages.

## 2026-04-10
- High proportion of .mdx and .tsx files in apps/docs/content/ and apps/docs/src/components/preview/ indicates this is a component library or design system documentation site—these are frontend showcase files, not test files; classification should filter by file naming patterns (*.test.ts, *.spec.ts, 

## 2026-04-10
- Absence of src/, server/, or backend directories combined with 484 docs files and only 2 config files suggests a static-site or framework-driven documentation site with no independent backend; deployment likely depends on the frontend build system (Vercel, Netlify, or npm run build).

## 2026-04-10
- Monorepo with Lerna orchestration using `lerna.json` + per-package `package.json` and `tsconfig.json` files; adapter pattern where each platform (Facebook, Slack, Twilio, Hangouts, Webex, Web) is isolated in its own package with shared `botworker.ts` interface and adapter base class.

## 2026-04-10
- Generator-based scaffolding (Yeoman) in `packages/generator-botkit/` produces boilerplate bot files (bot.js, sample features) suggesting developers use this tool to initialize new bot projects; subagents reviewing onboarding should examine generator templates and index.js logic.

## 2026-04-10
- Frontend appears minimal (mostly adapter-specific embed CSS and web client) rather than a dashboard/UI; primary deliverable is backend SDK/adapters; web client is for embedding chat widgets, not a standalone app.

## 2026-04-10
- Test coverage is substantial (54 test files across all packages) using `.tests.js` naming pattern (not `.test.ts`); suggests compiled JavaScript tests despite TypeScript source—subagents should check build configuration in tsconfig.json files for test output handling.

## 2026-04-10
- Travis CI configuration present (`.travis.yml`) alongside minimal GitHub infra files; this predates GitHub Actions workflows, suggesting older CI/CD pipeline—check if migration to Actions is in progress by looking for workflow files.

## 2026-04-10
- Minimal 8-file repositories with `index.js`, `test.js`, `package.json`, and `readme.md` are typically utility/helper libraries published to npm; the presence of `.npmignore` confirms distribution focus—subagents should examine `package.json` for `main` and `exports` fields to understand module entry

## 2026-04-10
- When a repo has zero frontend/infra/docs files beyond a single README and only one test file, prioritize examining `index.js` for API surface and `package.json` for dependency analysis (npm package size, peer dependencies, Node version constraints) to assess code quality and maintainability.

## 2026-04-10
- Monorepos with packages/data, packages/types, and packages/{demo-app,saas} pattern indicate a published SDK + multiple consumer applications; the adapter pattern (Langfuse + OpenTelemetry) in packages/data/src/ suggests the core IP is data transformation/normalization rather than UI—subagents should

## 2026-04-10
- Firebase config presence (.firebaserc, firebase.json) combined with Vite and Next.js frontends indicates deployment likely uses Firebase Hosting for static assets and Vercel/other platforms for Next.js SaaS; check CI workflow for distinct build/deploy stages per package.

## 2026-04-10
- JSON agent config files (quo_tav_agent.json, rag_earnings_agent.json, smol_deep_research_agent.json) in demo-app/src/data/ are not test fixtures but sample agent definitions used by the demo UI to showcase the visualization layer—these should be inspected to understand the expected trace/span schema

## 2026-04-10
- Repos with 339 docs files and only 2 backend demo files are likely developer platforms or SDKs with heavy documentation/blog focus rather than traditional applications; prioritize examining pyproject.toml for dependency/version info, GitHub workflows for deployment patterns, and blog files to unders

## 2026-04-10
- Multiple workflow files targeting different containers (cd-container-cuabot.yml, cd-container-kasm.yml, cd-container-lumier.yml) suggest a platform orchestrating multiple isolated execution environments; cross-reference these with demo/ and examples/ to understand the architecture's multi-target dep

## 2026-04-10
- Presence of conftest.py files in examples/sandboxes-cli/ alongside test_* files indicates pytest fixtures for parameterized sandbox testing (cloud VMs, local VMs, CDP, containers); this pattern is common for infrastructure-heavy SDKs—check conftest.py first to understand the test harness before exam

## 2026-04-10
- TypeScript examples (examples/computer-example-ts/) alongside Python backend suggests the primary SDK is Python but language bindings or integration patterns exist; examine package.json exports and tsconfig.json to understand if this is a thin wrapper or full reimplementation.

## 2026-04-10
- Puck is a visual page builder SDK with a clear separation: `packages/core/` contains the reusable editor component and data transformation logic, while `apps/demo/` and `apps/docs/` are consumer applications—the core IP lies in the data layer (`flatten-data.ts`, `insert.ts`, `resolve-all-data.ts`) w

## 2026-04-10
- The presence of `[...puckPath]` catch-all route in Next.js alongside separate `/custom-ui/` and `/rsc/` pages suggests the demo showcases multiple editor integration patterns (dynamic routing, custom UI composition, React Server Components); subagents should examine these page variants to understand

## 2026-04-10
- With 17 test files concentrated in `__tests__/` directories and snapshot testing for the main Puck component, this library prioritizes data transformation correctness over UI coverage—focus on `insert-component.spec.tsx`, `move-component.spec.tsx`, and `resolve-all-data.spec.tsx` to understand immut

## 2026-04-10
- Repos with ≤10 files and no test directory are typically prototype bots or CLI wrappers; prioritize examining the entry point and any auxiliary service files (sansekai.js pattern) to understand orchestration logic, then cross-reference package.json dependencies to infer the external API integrations

## 2026-04-10
- Presence of `key.json` in a minimal repo suggests credential injection via local file rather than environment variables—check if this is gitignored and document the expected schema (API keys, phone numbers, auth tokens) for security auditing.

## 2026-04-10
- Nuxt 3 applications with Directus CMS integration are becoming common; the presence of `.directus/run-scripts/` indicates custom Directus automation hooks (calculate-invoice.ts, handle-trigger.js, validate-schema.js)—prioritize examining these scripts and docker-compose.yaml to understand the CMS ex

## 2026-04-10
- Layered Nuxt architecture (layers/portal, layers/proposals) suggests feature-based modularization; subagents should examine nuxt.config.ts and each layer's app.vue to understand how layers are composed and whether they have isolated stores, middleware, or API routes.

## 2026-04-10
- Unclassified files (109) in this repo are predominantly Directus automation scripts, Nuxt layer configurations, and utility functions—the initial classifier may have struggled with `.directus/run-scripts/` pattern; these should be reclassified as backend/infra depending on whether they're database h

## 2026-04-10
- Repositories with embedded documentation examples (docs/en/*/package.json, docs/en/*/requirements.txt) alongside a primary language (Go) are typically CLI tools or SDKs with polyglot support; classify example configs as docs, not backend dependencies.

## 2026-04-10
- .ci/*.cloudbuild.yaml files with language-specific test variants (go.integration, js.integration, py.integration) indicate the repo validates code generation or multi-language code paths; prioritize examining the corresponding cmd/ entry points and generator.go to understand the code generation logi

## 2026-04-10
- Hugo static site configuration (.hugo/ directory with its own go.mod) suggests the docs build system is itself a Go application; examine .hugo/go.mod and .hugo/package.json to understand whether docs are built with custom Hugo modules or standard Hugo + Node.js plugins.

## 2026-04-10
- Repositories with `.react-router/types/` generated directories and `vite.config.ts` indicate React Router v7+ with Vite; prioritize examining `app/root.tsx` and route files (`app/routes/**/*.tsx`) as entry points rather than traditional index files, and check `vite.config.ts` for server API proxying

## 2026-04-10
- Pluggable handler patterns (`repoHandlers/{Default,Generic,ReactRouter,Threejs}RepoHandler.ts` extending `RepoHandler.ts`) combined with `static-mapping.json` suggest a framework for repository-specific parsing logic; examine the base `RepoHandler` interface and handlers.ts orchestration to understa

## 2026-04-10
- Presence of `app/chat/ai/providers.server.ts` and `providers.shared.ts` split indicates client-server provider abstraction typical of LLM/AI applications; these files likely contain API key injection, model selection logic, and streaming configuration—critical for understanding security boundaries a

## 2026-04-10
- `.env.example` without corresponding `.env` in file listing, combined with API key manager components (`api-key-manager.tsx`, `api-keys-provider.tsx`), suggests runtime credential injection rather than build-time secrets—inspect the providers and key manager to understand the credential storage stra

## 2026-04-10
- Minimal Python libraries with embedded data files (SQLite, JSON, CSV) often hide significant logic in the `__init__.py` entry point; prioritize examining that file for class definitions, data loading patterns, and API surface before diving into dependencies.

## 2026-04-10
- Presence of `.gitignore`, `LICENSE`, `README.md`, and `pyproject.toml` with no CI/CD files suggests a manually-maintained PyPI package; check the README for installation instructions and example usage to understand the intended deployment model.

## 2026-04-10
- React component libraries follow a src/lib dual-folder pattern where src/ contains authored TypeScript/JSX and lib/ contains the transpiled npm distribution; prioritize examining src/ for logic and patterns, then lib/ to understand the build output. The presence of .d.ts files alongside lib/ confirm

## 2026-04-10
- npm packages with docs/ folders containing example apps (docs/src/examples/*.js, docs/src/app.js) are typically published libraries demonstrating usage; these example files are valuable for understanding the API surface and intended patterns, not backend code.

## 2026-04-10
- Unclassified files like .codeclimate.yml, .travis.yml, and .npmignore should be reclassified as infra (CI/CD and publishing config) rather than left unclassified, as they reveal deployment and quality gates.

## 2026-04-10
- React component libraries with `.storybook/` configuration and `__tests__/` co-located with components indicate Storybook-driven component development; prioritize examining the root component (DataTable.tsx), its type definitions, and .storybook/main.ts to understand the component API surface and do

## 2026-04-10
- Unclassified files like `.babelrc.json`, `.npmignore`, `.prettierrc.js`, and `.editorconfig` are actually infra files that reveal transpilation strategy, publishing filters, and code style enforcement—these should be reclassified from "unclassified" to "infra" as they define the library's build and 

## 2026-04-10
- The presence of `tableReducer.ts` and `useColumns.ts` hooks alongside UI components suggests this library uses React Hooks + Redux-like state management patterns for complex table state; these should be prioritized as "backend" logic files even though they're co-located with components, as they defi

## 2026-04-10
- Go monoliths with `/static` folders containing HTML templates and vendored frontend libraries (Element UI, Layui) are server-rendered or static-served SPAs; prioritize examining `cmd/server.go` for HTTP route registration and middleware setup to understand how frontend assets and API endpoints are w

## 2026-04-10
- Presence of `config/GeoLite2-City.mmdb` (MaxMind geo IP database) alongside `tools/geo_test.go` and controller modules suggests this live chat system includes location-based features (user geolocation, analytics); this should be noted as a key business logic pattern.

## 2026-04-10
- Go projects without CI/CD configuration files (no `.travis.yml`, `.github/workflows/`, `Dockerfile`) but with `cmd/install.go` entry point suggest manual deployment or single-binary distribution model; inspect `cmd/install.go` to understand setup/initialization logic.

## 2026-04-10
- Unclassified files like `.gitignore`, `LICENSE`, `go.sum`, and data assets (`import.sql`, `.mmdb` files) should be reclassified: `.gitignore` and `LICENSE` → infra, `go.sum` → config, `import.sql` → data/docs, `.mmdb` → config/data—this cleanup prevents losing important deployment and initialization

## 2026-04-10
- Documentation-only repositories (no code, no config, only `.md` files and LICENSE) should be classified as `docs` architecture with `entry_point: README.md`; these represent educational handbooks, guides, or specifications rather than software projects, and should not have frontend/backend/config ca

## 2026-04-10
- The presence of a structured `docs/` folder with topic subdirectories (`fundamentals/`, `advanced/`, `audio/`, `automation/`) indicates a progressive learning path; prioritize README.md as the entry point and the `fundamentals/` files as the foundational layer for understanding the handbook's scope.

## 2026-04-10
- Chrome extensions with autonomous agent systems should prioritize examining the executor orchestrator (executor.ts), agent base classes (base.ts), action schema definitions (schemas.ts), and IPC message service (service.ts) to understand the control flow, capability boundaries, and inter-process com

## 2026-04-10
- Monorepo Chrome extensions with separate frontend (options/content UI) and backend (background service worker) should classify files in `chrome-extension/src/background/` as backend business logic even though they're TypeScript, as they represent autonomous agents, not UI rendering—this distinction 

## 2026-04-10
- Unclassified files like `.env.example`, `.eslintrc`, `.npmrc`, `.nvmrc`, `.husky/pre-commit`, and `.gitattributes` belong in infra category as they define build environment, code style enforcement, package management, and pre-commit hooks—not leaving them unclassified prevents losing deployment and 

## 2026-04-10
- Monorepo Python + TypeScript projects with `/deployment/k8s/` folder containing Helm values, Kustomize configurations, and externalsecret manifests indicate Kubernetes-native infrastructure-as-code; prioritize examining `pyproject.toml` for Python service dependencies, `helm-values_*.yaml` for micro

## 2026-04-10
- SDK-focused monorepos with `/js/sdk/src/v3/clients/` subdirectories suggest versioned API client libraries; the presence of parallel test suites (`__tests__/*IntegrationSuperUser.test.ts` vs `IntegrationUser.test.ts`) indicates role-based API testing strategy—prioritize examining `baseClient.ts` (au

## 2026-04-10
- Presence of `.env.example`, `deployment/k8s/kustomizations/helm-values_*.yaml`, and `Dockerfile` without explicit `.github/workflows/*.yml` file mention suggests this repo uses GitHub Actions (inferred from `.github/actions/` folder structure) with reusable custom actions for environment setup; insp

## 2026-04-10
- Pure Python libraries like `rich` should prioritize examining `__init__.py` for public API surface, followed by core module files (console.py, text.py, table.py) rather than following typical backend patterns; the entry point reveals what consumers actually import.

## 2026-04-10
- Unclassified files in this Python library context include `.coveragerc`, `.readthedocs.yml`, and `asv.conf.json` which belong in infra as they define testing coverage thresholds, documentation build config, and benchmarking parameters—critical for CI/CD and release quality gates.

## 2026-04-10
- Logo assets (`logo.ai`, `logo.svg`, `logo.txt`) in a documentation-heavy library should be reclassified to docs rather than left unclassified, as they support README rendering and branding across documentation sites.

## 2026-04-10
- Python monorepos with parallel `packages/*/pyproject.toml` structures indicate multi-package library distributions; prioritize examining the root package's `__init__.py` for public API surface first, then plugin architecture files (`_plugin.py`) to understand extensibility patterns.

## 2026-04-10
- Presence of both `Dockerfile` and `packages/*/Dockerfile` in a Python monorepo suggests selective containerization—the root Dockerfile likely serves all packages while package-specific Dockerfiles indicate standalone service deployments (e.g., MCP server); inspect both to identify deployment topolog

## 2026-04-10
- Files like `py.typed`, `.pre-commit-config.yaml`, and `.devcontainer/devcontainer.json` should be classified as infra rather than left unclassified, as they define type checking compliance, code style gates, and reproducible development environments—critical for monorepo standards enforcement.

## 2026-04-11
- React/Vite admin dashboard templates should be classified as pure frontend SPAs with zero backend files; hooks and type utilities (`.d.ts`) belong to frontend, not backend categories.

## 2026-04-11
- Image assets (`.svg`, `.png`) in `public/images/brand/` and banner files should remain unclassified or grouped as "assets" rather than docs, as they are runtime resources, not documentation.

## 2026-04-11
- ESLint and PostCSS configs in frontend-only projects belong in infra, not unclassified, as they define code quality gates and CSS processing pipelines critical to the build pipeline.

## 2026-04-11
- Next.js component library/registry projects with `/scripts/lib/` directories containing `registry-builder.ts`, `metadata-loader.ts`, and `import-transformer.ts` are build-time code generators, not backend services; classify these build utilities as backend only for understanding dependency chains, n

## 2026-04-11
- Presence of `components.json` alongside `biome.jsonc` and `commitlint.config.ts` in a TypeScript monorepo indicates a structured component registry system with enforced code quality gates—prioritize examining `components.json` and the registry-builder script to understand the block/component catalog

## 2026-04-11
- Next.js apps using `/content/markdown/*.mdx` and `/content/blocks-metadata.ts` follow a content-driven architecture where documentation and metadata are co-located and generated into the registry at build time; these files should be treated as backend schema definitions, not frontend code.

## 2026-04-11
- TypeScript monorepos with `packages/core/*/src/index.ts` entry points and parallel `packages/*/example/*` directories indicate a multi-client library distribution pattern; the root-level `turbo.json` and multiple `package.json` files signal workspace orchestration—prioritize examining each package's

## 2026-04-11
- Presence of both `.agents/` and `.claude/` skill directories alongside `.cursor/` configuration suggests this is an AI-augmented development repository with multiple agent runtimes; these should be classified as infra/config rather than docs, as they define tool interoperability contracts.

## 2026-04-11
- React example apps co-located in `packages/core/auth-js/example/react/` and `packages/core/realtime-js/example/app/` within library packages are runnable integration tests and reference implementations—classify them separately from the core library backend files, but prioritize examining them after 

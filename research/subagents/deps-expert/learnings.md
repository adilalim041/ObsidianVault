# Deps Expert — Learnings

> Auto-updated after each run.

---

## 2026-04-09
- Monorepo projects using separate tsconfig versions (TypeScript ^6 vs ^5) across packages can cause type compatibility issues when shared packages are imported; always align TypeScript versions or use strict inheritance patterns.

## 2026-04-09
- Projects requiring Node >=22.12.0 are bleeding-edge; verify platform support (especially Windows native modules like pg) before recommending to edge-case environments.

## 2026-04-09
- GitHub Actions workflows with Postgres service containers require explicit DATABASE_URL env vars with container hostname (e.g., `postgres:5432` vs `localhost:5432`) — this project handles it correctly.

## 2026-04-09
- Monorepos with mixed runtimes (Node in web + Bun in backend) must align peer dependency versions explicitly; React 19.0.0 vs 19.1.0 across apps can cause subtle hydration mismatches in shared UI packages.

## 2026-04-09
- Abandoned npm packages like `ffmpeg@0.0.4` disguised as normal dependencies (not devDeps) indicate code generation scripts; always audit why low-version system-level packages appear in production dependencies vs. nixpacks/docker system layers.

## 2026-04-09
- Missing CI/CD + Nixpacks-only deployments hide build issues until Railway tries to auto-detect stack; adding a Dockerfile or GitHub Actions workflow catches platform-specific failures (Windows native modules, missing system deps) early.

## 2026-04-09
- Monorepo projects with `<N.0.0` upper-bound Node version constraints are problematic for LTS-skipping developers; always test bleeding-edge Node versions in CI matrix to catch compatibility regressions early (e.g., Node v24 after v22 LTS).

## 2026-04-09
- Projects shipping native modules (SQLite, native DNS, pg) without a Dockerfile create silent deployment failures on Railway/Vercel when Nixpacks misdetects the stack or misses build dependencies; always pair native modules with explicit Dockerfile + CI testing on target platform.

## 2026-04-09
- Monorepo workspaces require version pinning documentation at the workspace level, not just root; version drift between `open-sse` and root `package.json` Node/TypeScript can cause hydration mismatches or type failures at build time.

## 2026-04-09
- Projects with native C++ modules (opencv, faiss, ONNX) and platform-specific fallbacks (python-magic-bin win32) *must* include an explicit Dockerfile + CI test on target platform (Linux for Railway); auto-detection via Nixpacks silently fails on missing system headers.

## 2026-04-09
- Pinned numpy + pandas versions from different release cycles (1.24.4 / 1.3.0) indicate dependency management debt; always validate transitive constraint closure before deployment.

## 2026-04-09
- Python version upper bounds (<3.12) are maintenance liabilities—will be violated by LTS-skipping developers within 12 months; use `<4.0` or drop upper bounds entirely, test >=3.13 in CI early.

## 2026-04-09
- Platform-marker-separated dependencies (torch for Darwin vs. non-Darwin) in single pyproject.toml mask local dev/test gaps; developers on unsupported platforms (Windows) cannot verify actual deployment target (Linux container) behavior locally, leading to "works on my Mac" failures in CI/Railway. Co

## 2026-04-09
- torch/torchaudio version misalignment (>=2.4.0 / >=0.26.0) suggests copy-paste

## 2026-04-09
- Projects with native C++ modules (pg, sqlite, etc.) tested only on Linux in CI but lacking explicit Dockerfile create silent deployment failures on Railway when Nixpacks misdetects system dependencies; always add a Dockerfile + matrix CI test on target platform (Linux) to catch Windows dev/Linux dep

## 2026-04-09
- Monorepo packages using tsconfig path aliases (e.g., `"pg-boss": "../../src"`) without explicit workspace field or peer dependency declarations can cause import resolution failures at build time; enforce version pinning and workspace documentation at root level.

## 2026-04-09
- Native module projects on Windows dev machines require explicit guidance (build tools, Python, WSL2 fallback) in README or CI setup docs; silence on platform-specific build requirements leads to "works on my Mac" failures cascading to new contributors.

## 2026-04-09
- Monorepo packages with fake npm stubs (fs, ffmpeg, micro) paired with system-level requirements in nixpacks.toml create silent Railway deployment failures; always audit dependencies for zero-functionality shims and cross-reference against CI/Dockerfile declarations.

## 2026-04-09
- React version drift (19.0.0 vs 19.1.0) between backend and web in an SSR monorepo causes hydration mismatches; enforce single React version at workspace root via pnpm-workspace.yaml + lockfile pinning, not per-package.

## 2026-04-09
- Missing explicit Dockerfile for Node monorepos using Prisma + system binaries (ffmpeg) on Railway means Nixpacks auto-detection becomes a

## 2026-04-09
- Python projects with native C++ modules (TgCrypto, ormar[sqlite]) paired with broad semver ranges (>=3, >=23) and no Dockerfile + no Python test CI are high-risk for Railway deployments; Nixpacks auto-detection silently fails on missing system headers—always add explicit Dockerfile + matrix CI (Linu

## 2026-04-09
- Multi-package Python workspaces with version skew (root >=3.8 vs. subproject >=3.10) and interdependent constraint management (ormar enforcing pydantic version)

## 2026-04-09
- Monorepos with pnpm workspace:* interdependencies + preinstall hooks enforcing package manager reduce installation conflicts but require explicit testing on target platforms (Windows dev vs. Linux container); Langfuse mitigates this via docker-compose.yml dev environment.

## 2026-04-09
- minimumReleaseAge with explicit exclusions (TODO note) indicates past supply chain concerns; projects adopting this pattern should auto-expire exclusions quarterly rather than manually maintaining version lists.

## 2026-04-09
- Next.js + next-auth version skew (major.minor drift) in SSR/hydration-heavy projects warrants matrix CI testing across React version pairs; Langfuse's deploy.yml lacks explicit Next.js version in CI matrix—recommend adding per-service Node version validation.

## 2026-04-09
- docker-compose.yml pointing to external pre-built images (docker.io/langfuse/langfuse-worker:3) with no Dockerfile in repo is safe for SaaS deployment but blocks local dev customization; document fallback to building from source if needed.

## 2026-04-09
- Bun-first monorepos deployed to Docker+Linux CI but developed on Windows need explicit cross-platform testing (Windows runner or WSL2 CI job) to catch path resolution and build tool differences; pinning bun version in Dockerfile to exact tag (not latest) is critical for reproducible deployments.

## 2026-04-09
- Wildcard workspace dependencies (@onlook/*) in monorepo packages without corresponding `pnpm-workspace.yaml` or explicit peer dependency declarations create silent install-time symbol resolution failures on Windows; enforce root-level workspace configuration and test on target platform before mergin

## 2026-04-09
- Disabled lint in CI (TODO comment) paired with `--max-warnings 0` enforcement suggests recent linting onboarding; projects in this state should document baseline warning count and explicit re-enablement date to prevent CI drift.

## 2026-04-09
- Nuxt 3 projects without explicit Dockerfile but deployed to Vercel/Railway should document which platform performs build auto-detection (Vercel Builders, Railway Nixpacks) and ensure CI tests that build scenario locally to catch missing system dependencies early.

## 2026-04-09
- pnpm workspace projects using extends: [...] and module imports (@nuxt/ui, @formkit auto-animate) should validate lockfile pin format and test `pnpm install` on Windows natively (not WSL2) to catch path resolution or bin shim issues before deployment.

## 2026-04-09
- Stripe SDK co-existence (stripe@^17.7.0 server + @stripe/stripe-js@^6.1.0 client) with broad semver ranges requires explicit version sync test in CI; recommend matrix test across Stripe SDK versions to catch payment flow regressions.

## 2026-04-09
- Projects with dual module boundaries (CommonJS entry point + type: module) using 'latest' version pins on ESM-only packages (chalk, inquirer) risk runtime failures on modern Node versions; enforce explicit version constraints and test CommonJS↔ESM interop in CI across the target Node version range (

## 2026-04-09
- CLI tools spawning external processes (chrome-launcher) on Windows require documented platform-specific prerequisites (Chrome install location, PATH setup) in README and CI matrix testing on Windows runners, not just Linux.

## 2026-04-09
- Absence of npm audit or supply chain scanning in CI (despite 'latest' pinning) is a red flag for projects handling web archival and library server duties; add `npm audit --audit-level=moderate` to CI workflow and document minimumReleaseAge exclusions if needed.

## 2026-04-09
- Custom exec.js wrapper invoking shell scripts (scripts/build_only.sh, scripts/parcel.sh) in package.json scripts introduces shell portability risk on Windows; document shebang requirements or migrate to cross-platform Node.js runners (node-glob, node-cross-spawn).

## 2026-04-10
- Minimal npm packages without CI pipelines are underestimated security risks; absence of GitHub Actions + npm audit means supply chain vulns silently accumulate—enforce CI as a baseline requirement even for single-purpose libraries.

## 2026-04-10
- ESM-only dependencies (got@11.8.0, file-type@16.0.0) without explicit `engines.node` in package.json create silent runtime failures on older Node; always pair ESM-only transitive deps with documented minimum Node constraint.

## 2026-04-10
- Test tooling drift (ava@3.0.0 → 6.x, nyc@15.0.0 → 17.x) undetected without CI; projects should enforce locked test dependency updates in CI matrix testing across Node LTS versions.

## 2026-04-10
- pnpm monorepos with `workspace:^` intra-package links must validate `pnpm install --frozen-lockfile` on Windows natively (not WSL2) in local dev before committing; CI-only Linux testing masks bin shim and path resolution bugs that surface on Windows.

## 2026-04-10
- Projects deploying to Firebase Hosting (public storybook + saas SPA) without npm audit or supply chain scanning in CI silently accumulate transitive vulns in dev dependencies (eslint, prettier plugins, vite); add `pnpm audit --audit-level=moderate` as a baseline CI gate for any public-facing artifac

## 2026-04-10
- Vite 7.0.4 + React 19.1.0 is a cutting-edge pairing released late 2024; absence of Windows runner in CI matrix (only ubuntu-latest) means potential incompatibilities with Adil's Windows 10 setup go undetected—recommend adding `windows-latest` matrix job for build-only validation on pull requests.

## 2026-04-10
- Monorepo projects using Yarn 1.x + Turbo/Lerna without npm audit or Windows CI matrix testing hide supply chain vulns and platform-specific shell script failures (publish.sh, smoke.mjs); add yarn audit gates and cross-platform matrix jobs even for internal tooling workflows.

## 2026-04-10
- Next.js 16 + React 19 (late 2024) + Puppeteer headless browser for E2E tests requires explicit Windows runner validation in CI; absence of windows-latest matrix job means smoke test failures on developer machines (Windows 10) surface post-merge, not pre-commit.

## 2026-04-10
- ESLint 7.32.0 (EOL 2021) in a modern monorepo (Turbo 2.x, TypeScript 5.5) signals linting toolchain drift; enforce ESLint major version bounds in root package.json and run `eslint --fix` in CI to catch compatibility regressions with TS rules.

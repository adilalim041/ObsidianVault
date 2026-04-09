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

# Infra Analysis: Puck

**Analyzed by:** integrations-dev
**Files read:** 28
**Key files:**
- `package.json` (root)
- `lerna.json`
- `turbo.json`
- `.github/workflows/ci.yml`
- `.github/workflows/publish.yml`
- `.github/workflows/publish-canary.yml`
- `packages/core/package.json`
- `packages/core/tsup.config.ts`
- `packages/core/tsconfig.json`
- `packages/core/jest.config.ts`
- `packages/tsup-config/index.ts`
- `packages/tsup-config/react-import.js`
- `packages/tsconfig/base.json`
- `packages/tsconfig/react-library.json`
- `packages/tsconfig/nextjs.json`
- `packages/create-puck-app/package.json`
- `packages/field-contentful/package.json`
- `apps/demo/package.json`
- `apps/demo/next.config.js`
- `apps/docs/package.json`
- `apps/docs/next.config.mjs`
- `scripts/publish.sh`
- `scripts/create-changelog.js`
- `scripts/get-unstable-version.js`
- `scripts/e2e/smoke.mjs`
- `scripts/e2e/smoke-framework.mjs`
- `packages/core/bundle/index.ts`
- `packages/core/bundle/rsc.tsx`

---

## Monorepo Setup

**Tool stack:** Yarn 1.22.19 (classic) + Lerna 9 + Turborepo 2.

Root `package.json` declares three workspace globs:
```json
"workspaces": ["apps/*", "recipes/*", "packages/*"]
```

**Lerna** manages only the _publishable_ subset of those workspaces:
```json
{
  "packages": [
    "apps/docs",
    "packages/core",
    "packages/create-puck-app",
    "packages/field-contentful",
    "packages/plugin-emotion-cache",
    "packages/plugin-heading-analyzer"
  ],
  "version": "0.21.2",
  "npmClient": "yarn"
}
```
Lerna is used _only_ for synchronized versioning (`lerna version --force-publish`), not for publishing (that's a shell script). It is NOT using `useWorkspaces` mode — packages are listed explicitly.

**Internal shared packages** (never published to npm, `"private": true`):
- `packages/tsconfig` — shared TypeScript config presets
- `packages/tsup-config` — shared tsup build config with CSS modules plugin
- `packages/eslint-config-custom` — shared ESLint rules

Recipes (`recipes/next`, `recipes/remix`, etc.) are full starter apps used by `create-puck-app` — they live in the workspace but are not published as packages.

**Dependency topology:**
```
apps/demo
  └─ @puckeditor/core (workspace link via transpilePackages)

apps/docs
  └─ @puckeditor/core (workspace link via transpilePackages)

packages/core
  └─ tsup-config (build only)
  └─ tsconfig (dev only)

packages/field-contentful
  └─ @puckeditor/core (devDep, peer not workspace dep)
  └─ tsup-config (build only)
```

Note: `@puckeditor/core` is declared as a devDependency in plugin packages, not as a workspace link. This means plugins build against the _installed_ (npm) version, not the local one. Intentional isolation strategy for plugin development.

---

## Build System

### tsup (via shared config)

All publishable packages use **tsup 8.x** with a shared base config defined in `packages/tsup-config/index.ts`.

Shared config produces:
- Both **CJS** (`dist/index.js`) and **ESM** (`dist/index.mjs`) output
- TypeScript declarations (`dts: true`)
- React is **injected globally** via `inject: ["../tsup-config/react-import.js"]` — this means consumers don't need to import React explicitly in JSX files within the library (React 17+ auto-JSX transform is NOT used here; instead React is injected as a module-level import)
- Externals explicitly listed: `react`, `react-dom`, all `@dnd-kit/*` packages, `@puckeditor/core`

```ts
// packages/tsup-config/react-import.js
import React from "react";
export { React };
// This file is injected at the top of every output chunk
```

### CSS Modules handling

`tsup-config` includes a custom **esbuild plugin** for `.module.css` files:
1. Intercepts `*.module.css` imports in namespace `css-module`
2. Runs PostCSS + `postcss-modules` to generate scoped class names
3. Returns a JS object `{ className: "scoped_className" }` as the module export
4. CSS output is emitted as a loader `css` chunk

This is a non-trivial custom solution — tsup does not handle CSS modules natively. The plugin does two-pass processing: first resolves the file to extract JSON class map, then emits the raw scoped CSS separately.

### Build entry points (core package)

`packages/core/package.json` build script:
```bash
rm -rf dist && tsup bundle/index.ts bundle/rsc.tsx bundle/no-external.ts bundle/internal.ts
```

Four entry points produce four separate output bundles:
| Entry | Export path | Purpose |
|---|---|---|
| `bundle/index.ts` | `"."` default | Full editor (client-side, includes CSS) |
| `bundle/rsc.tsx` | `"./rsc"` + `react-server` condition | React Server Components safe subset (Render, resolveAllData, etc.) |
| `bundle/no-external.ts` | (CSS variant) | Same as index but with no-external CSS (all CSS inlined) |
| `bundle/internal.ts` | `"./internal"` | Exposes `createReducer` for advanced consumers |

The `react-server` export condition in `package.json` is used by Next.js App Router to automatically select the RSC-safe bundle when importing from a Server Component.

### Turbo task graph

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "lint": {},
    "test": {},
    "dev": { "cache": false, "persistent": true }
  }
}
```

`"^build"` means: build all workspace dependencies first before building this package. `dev` is non-cached and persistent (long-running Next.js dev server).

Global env vars declared so Turbo can cache correctly when these change:
- `NEXT_PUBLIC_PLAUSIBLE_DATA_DOMAIN`
- `NEXT_PUBLIC_IS_LATEST`, `NEXT_PUBLIC_IS_CANARY`
- `VERCEL_GIT_COMMIT_REF`
- `NEXT_PUBLIC_BASE_URL`

### Testing

Jest 29 + `ts-jest` + `jest-environment-jsdom`.

Key config decisions in `packages/core/jest.config.ts`:
- Uses `ts-jest/presets/js-with-ts-esm` preset — ESM mode throughout
- `transformIgnorePatterns` explicitly re-enables transform for `@preact/signals-core`, `@preact/signals-react`, `@dnd-kit` — these ship ESM-only and Jest (CommonJS runtime) cannot execute them without transform
- CSS modules are stubbed via `identity-obj-proxy` (returns the class name string as the value)

---

## CI/CD

### ci.yml — PR gate

Triggers on push/PR to `main`. Single `ubuntu-latest` job, Node 20.

```yaml
steps:
  - uses: actions/checkout@v6.0.2
  - uses: actions/setup-node@v6
    with: { node-version: 20 }
  - run: yarn
  - run: yarn test
  - run: |
      if yarn lint && yarn format:check; then
        echo "Linting and formatting checks passed."
      else
        exit 1
      fi
  - run: yarn build
  - run: |
      if [ $? -ne 0 ]; then   # BUG: always true, $? is from echo above
        exit 1
      fi
```

**Bug in CI:** The "Check for build failures" step checks `$?` after `echo` (from the previous `if` block), not after `yarn build`. This step is effectively a no-op — it will never catch a build failure because `$?` always reflects `echo`'s exit code (0). Build failures in the previous step would abort the job naturally due to shell `set -e`, so in practice this doesn't cause missed failures, but the explicit check is misleading.

No Turbo cache between runs (no `actions/cache` step). Every CI run does a full cold build.

### publish.yml — stable release

Triggers on push to `releases/**` branches. Only runs if commit message starts with `release: `.

```yaml
steps:
  - Extract version from commit message via sed
  - Tag commit via tvdias/github-tagger@v0.0.1
  - yarn install
  - ./scripts/publish.sh latest    # publishes with --tag latest to npm
  - git commit --allow-empty "ci: trigger build" && git push
    # Forces Vercel to create a distinct deployment for this release branch
```

The empty git commit trick is clever: Vercel deploys on push, so the release commit (tagged) gets a distinct Vercel preview URL separate from the docs site's `latest` deployment.

### publish-canary.yml — canary on every commit to main

Triggers on push to `main` or `releases/**`. Skips if commit message starts with `release: ` (avoids double-publish on release branches).

```yaml
steps:
  - checkout with fetch-depth: 0   # full history needed for conventional-bump
  - yarn install
  - yarn release:canary             # bumps version to {version}-canary.{sha}
  - ./scripts/publish.sh canary    # publishes with --tag canary to npm
```

Canary version format: `0.21.2-canary.abc1234` (version from root package.json + git short SHA).

### publish.sh — manual publish script

```bash
cd packages/core && npm publish --access public --tag $1
cd packages/field-contentful && npm publish --access public --tag $1
cd packages/plugin-emotion-cache && npm publish --access public --tag $1
cd packages/plugin-heading-analyzer && npm publish --access public --tag $1
cd packages/create-puck-app && npm run removeGitignore && npm publish --access public --tag $1 && npm run restoreGitignore
```

Each package is published individually via `npm publish` (not lerna publish). The `create-puck-app` package does a `.gitignore -> gitignore` rename before publish so that the `templates/.gitignore` file is included in the npm tarball (npm normally ignores `.gitignore` files).

---

## TypeScript Configuration

Three-level inheritance chain:

```
packages/tsconfig/base.json
  └── packages/tsconfig/react-library.json  (used by packages/core, plugins)
  └── packages/tsconfig/nextjs.json         (used by apps/demo, apps/docs)
        └── packages/core/tsconfig.json extends react-library.json
```

**base.json** key settings:
- `isolatedModules: true` — each file compiled independently, required for tsup/esbuild
- `skipLibCheck: true` — avoids type errors in node_modules
- `declarationMap: true` — source maps for `.d.ts` files
- `moduleResolution: "node"` — NOT `bundler` or `node16`, classic resolution

**react-library.json** additions:
- `jsx: "react-jsx"` — new JSX transform (React 17+), but combined with the `inject` in tsup-config this means React is available both via auto-transform AND explicit injection — effectively double-safe
- `target: "es6"`, `lib: ["ES2015", "DOM"]`
- `typescript-plugin-css-modules` plugin — enables IDE type-checking of `.module.css` imports

**nextjs.json** (for apps) key differences from react-library:
- `strict: false` — apps are less strict than the library
- `noEmit: true` — TypeScript only type-checks, Next.js/webpack does the actual compilation
- `incremental: true` — faster rebuilds
- `jsx: "preserve"` — Next.js handles JSX compilation

**packages/core/tsconfig.json** adds test types:
```json
{ "compilerOptions": { "types": ["node", "jest", "@testing-library/jest-dom"] } }
```

---

## Package Publishing

### Release flow (manual, triggered by maintainer)

```
1. git fetch --tags
2. conventional-recommended-bump -p angular
   → determines next semver bump (patch/minor/major) from commits
3. yarn version --new-version {bump}
   → updates root package.json version
4. lerna version --force-publish -y --no-push --no-changelog --no-git-tag-version {version}
   → syncs version to ALL lerna packages (core, plugins, docs, create-puck-app)
5. node scripts/create-changelog
   → reads git commits via standard-changelog, prepends to CHANGELOG.md
6. git add -u && git commit -m "release: v{version}"
7. git push to releases/{version} branch
8. publish.yml GitHub Action triggers:
   → tags the commit
   → publishes all packages to npm with --tag latest
   → empty commit to trigger Vercel docs deployment
```

### Versioning

All packages are **synchronously versioned** — they always share the same version number. `lerna version --force-publish` forces all packages to version even if unchanged.

### Canary releases

Every push to `main` that doesn't start with `release: ` automatically publishes a canary. Format: `{current-version}-canary.{git-short-sha}`. This gives consumers a way to test unreleased code without waiting for a stable release.

---

## Anti-patterns

1. **Yarn 1.x (classic) in 2024.** Yarn 1.22.19 is effectively unmaintained. No workspaces hoisting controls, no PnP, slower than pnpm. With a monorepo this size, switching to pnpm would save ~30% install time and give better hoisting isolation.

2. **ESLint 7.32.0 (EOL 2021).** Both root and all packages pin ESLint 7. ESLint 9 flat config is the current standard. This will cause compatibility issues with modern TypeScript ESLint plugins.

3. **No CI caching.** `ci.yml` has no `actions/cache` for Yarn cache or Turbo remote cache. Every PR runs a full cold `yarn install` + `yarn build`. With ~10 packages this is slow but tolerable; at scale it becomes expensive.

4. **publish.sh uses sequential cd + publish.** If any package fails mid-publish, the script stops and only some packages get the new version on npm. No rollback mechanism. Should use `--workspaces` flag or lerna publish with proper error handling.

5. **`$?` check bug in ci.yml.** The "Check for build failures" step is a dead check (always passes). Low severity because shell `set -e` catches real failures, but misleading.

6. **Demo app uses Next 16, docs use Next 15.** Two different Next.js major versions within the same monorepo. Both use React 19 so hydration is fine, but having different Next.js versions means different App Router feature sets and potential config drift.

7. **No Windows CI runner.** Only `ubuntu-latest`. Scripts use `rm -rf` (Unix) in `package.json` scripts, which would fail on Windows native execution (though WSL2 mitigates for developers). No validation that the library works on Windows consumers.

8. **`moduleResolution: "node"` not `"bundler"`.** In 2024 the recommended setting for library packages using tsup is `"bundler"`. The classic `"node"` resolution can miss exports map conditions during type-checking.

9. **Smoke test memory threshold is hardcoded (300 MB) with no CI gate.** `yarn smoke` is a standalone command not called from any CI workflow — it's only run locally. Memory regression detection is entirely manual.

---

## Применимо к нашим проектам

### vault-research-agent / любой GitHub Actions workflow

- **Release branching pattern:** `releases/**` as trigger + commit message guard (`startsWith(github.event.head_commit.message, 'release: ')`) is a clean way to separate stable vs canary publishing in the same repo. Applicable to any npm package we might publish.
- **Canary version with git SHA:** `{version}-canary.{git-short-sha}` format is immediately adoptable for pre-release builds. The `get-unstable-version.js` script is trivial (8 lines) and can be copied verbatim.
- **Empty commit to force Vercel deploy:** `git commit --allow-empty "ci: trigger build"` is a useful trick when Vercel deployment needs to happen on a specific branch (e.g., to get a versioned preview URL for docs).
- **fetch-depth: 0 in canary workflow:** Required for `conventional-recommended-bump` to read full git history. Any workflow using conventional commits tooling needs this.

### Research Dashboard (Vercel)

- **`basePath` driven by branch name:** `apps/docs/next.config.mjs` sets `basePath` to `/v/{version}` on release branches, `/v/canary` on canary pushes, and `""` on main. This enables multiple versioned docs deployments under one Vercel project with automatic routing. Directly applicable if we ever version the Research Dashboard or its docs.
- **`transpilePackages` for local monorepo packages:** `next.config.js` uses `transpilePackages: ["@puckeditor/core"]` to tell Next.js to compile the local package through its webpack pipeline rather than expecting pre-built output. Useful if Research Dashboard ever pulls in shared UI packages from a monorepo without pre-building them.
- **`react-server` export condition:** The pattern of providing a separate RSC-safe entry point (`"react-server"` condition in exports map) is the correct way to ship a library that works in both Next.js App Router Server Components and client components. Applicable if we build any shared React library for the dashboard.
- **Shared tsup-config as internal workspace package:** Extracting build configuration into a private `packages/tsup-config` workspace package is a clean pattern for keeping build tooling consistent across multiple publishable packages. If Research Dashboard grows to have multiple deployable packages, this is worth adopting.

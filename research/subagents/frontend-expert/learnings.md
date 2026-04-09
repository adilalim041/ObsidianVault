# Frontend Expert — Learnings

> Auto-updated after each run.

---

## 2026-04-10
- When using `replace_all: true` in bulk string replacements, be careful that generic words (like "learnings") may appear in unexpected places like prose sentences, causing partial replacements that produce mixed-language text. Always scope bulk replacements to exact contexts or do them one by one.
- Parsing timestamps from structured filenames (e.g., `2026-04-09_2230.md`) is more reliable than parsing file metadata via API, since GitHub Contents API doesn't expose file creation/modification timestamps.

## 2026-04-10
- Two-tier caching (in-memory Map + localStorage with TTL) is an effective pattern for GitHub API rate-limit mitigation on unauthenticated requests (60 req/hr limit). The localStorage layer persists across page reloads while the memory layer avoids JSON parse overhead on repeated reads.
- When filtering internal notes from research candidates, matching against the parsed display name (after filename-to-title conversion) with regex patterns is more reliable than matching raw filenames, since filenames use kebab-case while the filter criteria are in natural language.
- Recharts (already a dependency via package.json) integrates well into dark-themed dashboards by passing custom `contentStyle` to Tooltip and using CSS variable colors for axis/tick styling.

## 2026-04-09
- Component libraries often extend tailwind-merge to handle custom utility classes, which can be a useful pattern for complex design systems.

## 2026-04-09
- Tremor uses a comprehensive color palette system with semantic naming (canvasBackground, lightBorder, etc.) rather than direct Tailwind color references, making themes more maintainable.

## 2026-04-09
- SSR-safe theme initialization using lazy state initializers prevents hydration mismatches when reading from localStorage.

## 2026-04-09
- Implementing both light/dark themes AND color theme variants (emerald, violet, etc.) provides flexible branding options for dashboard applications.

## 2026-04-09
- Component libraries can extend tailwind-merge with custom utility classes (shadow-tremor-input, rounded-tremor-default) to create branded design tokens while maintaining proper class conflict resolution.

## 2026-04-09
- Using semantic color palette naming (canvasBackground, lightBorder, darkText) with numeric shade mappings creates more maintainable themes than hardcoding color references throughout components.

## 2026-04-09
- React Router's useRouteLoaderData provides a clean pattern for sharing server-loaded data between parent and child components without prop drilling.

## 2026-04-09
- The conditional rendering pattern in QueueStatsCards (showing warning stats only when problemQueues > 0) creates cleaner dashboard UIs than always showing zero states.

## 2026-04-09
- Professional component libraries use semantic color palette naming (canvasBackground: 50, lightBorder: 200, darkText: 700) mapped to numeric Tailwind shades, making theme systems more maintainable than hardcoded color references.

## 2026-04-09
- The tremorTwMerge pattern of extending tailwind-merge with custom utility classes (shadow-tremor-input, rounded-tremor-default, text-tremor-metric) allows component libraries to create branded design tokens while maintaining proper CSS class conflict resolution.

## 2026-04-09
- Next.js server actions with Zod validation provide a clean pattern for type-safe API endpoints that could be adapted for other full-stack React frameworks.

## 2026-04-09
- The optimistic updates pattern in leaderboard-list.tsx (storing original submissions to avoid reshuffling during mutations) is a good UX pattern for voting/ranking interfaces.

## 2026-04-09
- Conditional session recording based on route patterns (only recording /studio and /publish routes) is a smart privacy-conscious approach to user analytics.

## 2026-04-09
- When analyzing repositories, it's important to distinguish between backend Python web frameworks like Streamlit and frontend JavaScript frameworks - they serve different purposes and have incompatible architectures.

## 2026-04-09
- The conditional rendering pattern for warning stats (showing problemQueues only when > 0) creates cleaner dashboard UIs than always displaying zero states.

## 2026-04-09
- React Router's useRouteLoaderData provides a clean pattern for sharing server-loaded data between parent and child components without prop drilling.

## 2026-04-09
- Next.js server actions with Zod validation and Clerk auth checks provide a robust pattern for type-safe API endpoints with proper authorization.

## 2026-04-09
- The provider composition pattern in Next.js layout.tsx (ThemeProvider > TooltipProvider > AppProviders) creates a clean hierarchy for context management.

## 2026-04-09
- Using Geist font variables with cn() utility for consistent font loading is becoming a standard pattern in modern Next.js apps.

## 2026-04-09
- Legacy JavaScript libraries using UMD builds and browser globals (window.RSSParser) are fundamentally incompatible with modern component-based frontend architectures and should be distinguished from actual frontend framework code during analysis.

## 2026-04-09
- Streamlit applications use Python for both backend and frontend logic, creating web UIs through Python APIs rather than JavaScript frameworks - they're incompatible with modern React/Vue/Svelte component architectures.

## 2026-04-09
- The lazyImport utility pattern with named exports allows for clean code splitting while maintaining TypeScript safety and avoiding default import issues.

## 2026-04-09
- Using CSS custom properties (--user-cards-count) set via React for dynamic styling creates a bridge between component state and CSS without full CSS-in-JS adoption.

## 2026-04-09
- The MutationObserver pattern for watching DOM class changes (like 'dndState') provides a way to react to global state changes that exist outside React's component tree.

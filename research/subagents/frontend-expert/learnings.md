# Frontend Expert — Learnings

> Auto-updated after each run.

---

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

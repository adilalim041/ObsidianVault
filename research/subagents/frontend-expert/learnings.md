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

## 2026-04-09
- The Google Translate DOM polyfill pattern (monkey-patching removeChild/insertBefore) is a clever solution for preventing React crashes when browser translation tools modify the DOM structure.

## 2026-04-09
- Intercepting OAuth callback errors before NextAuth processes them allows preserving IdP error_description that would otherwise be stripped, improving user experience during auth failures.

## 2026-04-09
- The provider composition pattern in Next.js _app.tsx creates a clean hierarchy for context management, though performance implications should be considered with deep nesting.

## 2026-04-09
- The motion library (successor to framer-motion) with declarative initial/animate props and performance optimizations like willChange and translateZ provides a modern animation pattern for React components.

## 2026-04-09
- Using window.innerHeight checks with resize listeners to dynamically adjust component rendering based on viewport height is a practical responsive design pattern beyond just CSS media queries.

## 2026-04-09
- The @onlook/ui pattern of maintaining an internal design system package alongside shadcn/ui components allows for custom extensions while keeping shadcn compatibility.

## 2026-04-09
- Vue 3's Composition API with `<script setup>` provides a clean pattern for component logic, but the syntax and reactivity system are fundamentally incompatible with React hooks despite conceptual similarities.

## 2026-04-09
- The dynamic component mapping pattern (`componentMap[block.collection]`) in PageBuilder.vue is a powerful CMS-style approach that could be adapted to React using dynamic imports and component registries.

## 2026-04-09
- Injecting CSS custom properties through framework head management (useHead in Nuxt, or similar in Next.js) creates a bridge between component theming and global CSS variables.

## 2026-04-09
- The pattern of separating AppHeadContent and AppContent components to avoid hydration mismatches when using theme providers is a sophisticated Next.js optimization technique.

## 2026-04-09
- Using Jotai for atomic state management alongside @tanstack/react-query for server state represents a modern, performant state management architecture that avoids provider hell.

## 2026-04-09
- The crypto.randomUUID polyfill pattern for non-HTTPS environments shows good cross-environment compatibility thinking in production applications.

## 2026-04-09
- CSS custom properties with comprehensive light/dark mode theming using `prefers-color-scheme` provides a robust theming foundation that could be adapted to work alongside Tailwind's dark mode utilities.

## 2026-04-09
- The URL validation pattern in redirector.html using `new URL()` constructor in a try-catch block is a clean way to validate URLs before processing them in JavaScript.

## 2026-04-10
- The pattern of conditional provider wrapping based on environment variables (returning just children when conditions aren't met) is cleaner than conditional JSX rendering within the provider.

## 2026-04-10
- Using `defaults: '2025-11-30'` in PostHog config suggests a feature flag or configuration versioning system that could be useful for gradual rollouts.

## 2026-04-10
- The `generateStaticParams` pattern using `blocksMetadata.map()` to create all possible route combinations is an efficient static generation approach for content-driven sites.

## 2026-04-10
- Custom design token naming patterns like `title-50`, `background-soft-400`, and `color-base-100` suggest a systematic approach to color scales that could be adapted to work with Tailwind's numeric scale system.

## 2026-04-10
- The compound component pattern for Carousel (separate CarouselContent, CarouselItem, CarouselNext, CarouselPrevious) provides better composability than monolithic carousel components.

## 2026-04-10
- Using react-aria-components alongside custom Tailwind design systems shows how to maintain accessibility while building custom component libraries.

## 2026-04-10
- The embedded messenger positioning pattern using fixed positioning with bottom transitions creates a smooth slide-up chat widget effect that could be adapted to modern React chat components.

## 2026-04-10
- Legacy chat UI implementations often use Handlebars for message templating, but this pattern translates well to React component props for message rendering.

## 2026-04-10
- The typing indicator animation using three spans with CSS animations is a classic pattern that remains effective in modern implementations.

## 2026-04-10
- The pattern of importing theme CSS from shared UI packages (`@evilmartians/agent-prism-ui/theme.css`) in both Vite and Next.js apps shows how to maintain consistent theming across different framework implementations in a monorepo.

## 2026-04-10
- Using `openTelemetrySpanAdapter.convertRawDocumentsToSpans()` pattern shows how to create clean data transformation layers when working with complex external data formats like OpenTelemetry traces.

## 2026-04-10
- The Layout component's sidebar structure with grouped navigation sections (Workspace/Tools) and sticky footer navigation represents a professional dashboard pattern that works well with Tailwind utilities.

## 2026-04-10
- The ComponentConfig pattern with fields, defaultProps, and render functions creates a powerful way to define configurable components that could be adapted for any component library system.

## 2026-04-10
- The hydration-safe pattern using useState(false) + useEffect(() => setIsClient(true)) prevents SSR mismatches when accessing browser APIs like window.location.

## 2026-04-10
- The `refAutoReset(markRaw(IconCopy), 3000)` pattern in Vue provides automatic icon switching with timeout that could be adapted to React with useState + useEffect + setTimeout for copy feedback UX.

## 2026-04-10
- The Tauri event listening pattern with `listen("event-name", callback)` in onMounted shows how to handle cross-process communication in desktop apps, which could be adapted for Electron or other desktop frameworks.

## 2026-04-10
- Using `markRaw()` around icon components in Vue prevents reactivity overhead for static assets, similar to how React.memo or useMemo can optimize icon rendering.

## 2026-04-10
- The table slot pattern `<template #registered_at="{ item }">` for customizing cell rendering is equivalent to React's render props or children-as-function patterns for flexible table components.

## 2026-04-10
- The PageBuilder component's `componentMap` pattern with `resolveComponent()` creates a clean dynamic component system that could be adapted to React using dynamic imports or component registries.

## 2026-04-10
- Vue's `defineShortcuts` composable for keyboard shortcuts (meta_k handler) shows a clean pattern that could be replicated in React with custom hooks using addEventListener.

## 2026-04-10
- The CSS custom properties injection pattern in `useHead()` provides runtime theming that's more flexible than static Tailwind configurations.

## 2026-04-10
- The GlobalSearch component's validator function on collections prop demonstrates type-safe runtime validation that could be adapted to React with PropTypes or runtime schema validation.

## 2026-04-10
- Hugo template partials with conditional rendering ({{ if .Site.Params.versions }}) provide a clean way to handle optional UI components that could inspire conditional rendering patterns in React components.

## 2026-04-10
- The version dropdown's path manipulation logic for deep-linking across versions demonstrates a useful pattern for maintaining navigation context when switching between different app versions.

## 2026-04-10
- The environment variable fallback pattern `env[key] || apiKeys[key] || undefined` provides a clean hierarchy for API key management across server/client boundaries.

## 2026-04-10
- Using `useCallback` with form submission handlers that depend on input state prevents unnecessary re-renders while maintaining proper dependency arrays.

## 2026-04-10
- The conditional layout pattern switching between welcome state and chat state (`messages.length === 0 ? <Welcome/> : <ChatView/>`) creates clean UX transitions for chat applications.

## 2026-04-10
- When analyzing repositories, check file extensions first - .kt files indicate Android/Kotlin code, not web frontend code.

## 2026-04-10
- Jetpack Compose's state management patterns (mutableStateOf, collectAsState) are conceptually similar to React hooks but use different APIs and aren't transferable.

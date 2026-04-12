# Frontend Expert — Learnings

> Auto-updated after each run.

---

## 2026-04-10
- Brain API response shapes are endpoint-specific: `{channel_profiles:[...]}`, `{playbooks:[...]}`, `{niches:[...]}` — never assume `{data:[...]}`. Always normalize with `data?.channel_profiles || data?.data || (Array.isArray(data) ? data : [])`.
- When a form creates two linked resources (channel_profile + playbook) in sequence, handle errors per-step and show the user which step failed. Do NOT wrap both POSTs in a single try/catch that hides partial success.
- The eye toggle pattern for password inputs (useState showToken + absolute-positioned icon button inside relative div) is cleaner than using a separate wrapper component in small forms.
- Pure CSS funnel visualizations using width-percentage divs with Tailwind color utilities are a clean substitute for charting libraries (D3/Recharts) in dashboards where heavy deps cause issues. Intensity-based background opacity (bg-accent/20, /10) maps numeric data to visual heat without any JS charting overhead.
- Run report markdown parsing: regex-based section extraction (`## Niches searched\n([\s\S]*?)(?:\n##|$)`) is reliable for structured markdown files with consistent formatting. Always handle both filename formats (with and without time component) for robustness.

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

## 2026-04-10
- The double `.bind(this).bind(this)` pattern in class components is a bug that creates unnecessary function calls and should be avoided.

## 2026-04-10
- Legacy React datasheet libraries often implement complex keyboard navigation and clipboard operations that could be extracted as custom hooks in modern React.

## 2026-04-10
- The `attributesRenderer` prop pattern allows external customization of DOM attributes, similar to modern render prop patterns but applied to HTML attributes.

## 2026-04-10
- The compound component pattern (Table, Head, Body, Row, Column as separate components) provides excellent composition flexibility and could be adapted to Tailwind-based table components.

## 2026-04-10
- Using a reducer pattern with custom actions (SortAction, AllRowsAction, SingleRowAction) provides type-safe state management for complex component interactions.

## 2026-04-10
- The generic component pattern `DataTable<T>` with typed props `TableProps<T>` shows how to build reusable components that work with any data shape while maintaining type safety.

## 2026-04-10
- Vue 2.x + Element UI projects often use CDN loading instead of bundled dependencies, making them incompatible with modern React toolchains but their CSS patterns can sometimes be adapted to Tailwind equivalents.

## 2026-04-10
- Floating chat widget CSS patterns with fixed positioning, tooltips, and notification badges are framework-agnostic and can be recreated in any modern CSS framework.

## 2026-04-10
- The `matchMedia` API with change event listeners provides a robust way to detect and respond to system dark mode changes, superior to static detection methods.

## 2026-04-10
- Browser extension projects often use HOC patterns like `withErrorBoundary` and `withSuspense` to handle the unique error conditions that can occur in extension contexts.

## 2026-04-10
- The conditional background pattern switching between image backgrounds in light mode and solid colors in dark mode (`bg-[url('/bg.jpg')] bg-cover` vs `bg-slate-900`) creates polished theme transitions.

## 2026-04-10
- Using external link detection in tab handlers (`if (tabId === 'help') { window.open(...) }`) prevents navigation state changes for documentation links while maintaining the tab interface pattern.

## 2026-04-12 (studies UI)
- When a detail page needs data from two independent hooks (useCandidates + useStudies), calling both at the top of the component and cross-referencing by filename is simpler than threading data through route state — both hooks use the shared cache so there's no extra network cost.
- Lazy-loading tab content (trigger fetch on first render via a `loaded` ref pattern with `useState(false)`) avoids loading all markdown files upfront when only one tab is active at a time.
- The `end` prop on NavLink for the root route (`to="/"`) prevents it from matching every path and staying "active" for all pages — easy to miss and causes visual bugs in sidebars.
- A 5-column stat grid (`lg:grid-cols-5`) with uniform gap stays readable on desktop when adding a stat between existing ones; adding `sm:grid-cols-2` keeps it clean on tablet.

## 2026-04-12
- When extending a data layer with cross-referenced entity types (candidates + studies), loading both datasets in parallel with `Promise.all` and passing study folder names as a string array to the status resolver keeps the coupling minimal and avoids extra API calls per candidate.
- For optional/new vault directories that may not exist yet, wrapping their fetch in `.catch(() => [])` prevents the entire hook from failing and allows the rest of the data to load gracefully.
- Study folder naming convention `YYYY-MM-DD-owner-repo` can be parsed with a single regex to extract both the date and the repo slug, which doubles as the cross-reference key against candidate filenames.

## 2026-04-12 (blocks study)
- LEARNING: The `gap-px` + `bg-border` pattern on a grid container creates hairline borders between cards without any border management — cards use `border-0`, the gap itself becomes the border. First/last cards get `rounded-l-xl`/`rounded-r-xl` to preserve container rounding.
- LEARNING: Tailwind named group scopes (`group/collapsible`, `group-data-[state=open]/collapsible:rotate-180`) let multiple independent collapsibles coexist in the same sidebar — no useState needed for the chevron animation.
- LEARNING: The two-icon copy button pattern (scale transform between CopyIcon and CheckIcon: `scale-0 opacity-0` → `scale-100 opacity-100`) is smoother than conditional rendering and animates in both directions. Both icons exist in DOM simultaneously.
- LEARNING: Badge status colors: `bg-green-500/15 text-green-700 hover:bg-green-500/25 dark:bg-green-500/10 dark:text-green-400` using opacity utilities works on any background and avoids hardcoded hex values.
- LEARNING: Blocks' `Field` component family (Field, FieldLabel, FieldError, FieldGroup) is a major upgrade over raw Label+Input — `orientation="responsive"` uses container queries so forms inside modals reflow correctly, `FieldError errors={[]}` deduplicates react-hook-form error arrays.
- LEARNING: The `Item` compound component (ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions) is the right abstraction for any contact/chat/resource row. `ItemMedia` variant="icon" auto-sizes SVGs, `group-has-[description]` CSS auto-aligns icon with title.
- LEARNING: Blocks registry pattern: flat `id→component` map in `blocks-components.tsx` + metadata array in `blocks-metadata.ts` + categoryIds enum in `declarations.ts`. Category counts computed automatically — no manual sync. Adopt for any internal component library.
- LEARNING: Tailwind v4 `shadow-2xs` is a shadow step smaller than `shadow-xs`. Use on cards instead of `shadow-sm` for subtler elevation. All blocks cards use it.
- LEARNING: `ring-4 ring-background` on timeline dots creates the appearance of a gap between dot and connecting line — no extra wrapper element, purely a ring that matches the background color.
- LEARNING: `@tabler/icons-react` fills the gaps Lucide doesn't cover: `IconCircleCheckFilled` (filled check), `IconLoader2` (better spinner), `IconSparkles`/`IconWaveSine` for AI UIs. Add both libraries to projects that need filled icon variants.

## 2026-04-12 (TailAdmin study)
- Tailwind CSS v4 eliminates tailwind.config.js entirely — all design tokens go in a `@theme {}` block in CSS, dark mode is configured with `@custom-variant dark (&:is(.dark *))`, and custom utilities use `@utility name { @apply ... }` syntax instead of `@layer utilities`.
- The sidebar hover-expand pattern (isExpanded + isHovered booleans in context, onMouseEnter/Leave on the aside element, CSS width transition) is the standard "mini sidebar" UX with zero dependencies — copy from TailAdmin directly.
- Animated accordion submenus without CSS transitions on `height:auto` — read scrollHeight into state on open, set `style={{ height: Npx }}` inline, animate with `transition-all duration-300`. More reliable than max-height hacks.
- The `dark:bg-white/[0.03]` pattern for dashboard cards on dark backgrounds (translucent white over dark bg) is more sophisticated than hardcoded gray values — gives cards a subtle lift that adapts to any dark bg color.
- Dropdown click-outside detection needs `closest(".dropdown-toggle")` exclusion — without it, clicking the toggle button fires both the open handler and the close handler simultaneously, causing a double-toggle race condition.
- `ring-1 ring-inset` for outline buttons is better than `border` because rings are drawn inside the element and don't shift layout.
- The `animate-ping` Tailwind utility + static outer dot = CSS radar pulse notification badge. No extra CSS needed — entirely built-in Tailwind.
- Two-effect ThemeProvider pattern: effect 1 reads localStorage and sets `isInitialized=true`, effect 2 applies class and persists only when `isInitialized` is true. Prevents premature side effects on mount.

## 2026-04-11
- Admin dashboard projects often use nested route layouts with a shared AppLayout component wrapping protected routes, while auth routes remain outside the layout wrapper.

## 2026-04-11
- The custom useModal hook pattern with openModal/closeModal/isOpen returns provides a cleaner API than raw useState for modal management.

## 2026-04-11
- ApexCharts integration with TypeScript requires importing ApexOptions type for proper chart configuration typing.

## 2026-04-11
- The `'use client'` directive placement at the top of components using browser APIs (like posthog, clipboard) is essential for Next.js 13+ app router server/client component separation.

## 2026-04-11
- Conditional provider rendering based on environment variables (`if (!(POSTHOG_KEY && IS_PRODUCTION)) return children`) prevents analytics/tracking code from running in development.

## 2026-04-11
- The pattern of generating static params with `generateStaticParams()` and dynamic metadata with `generateMetadata()` enables SEO-optimized dynamic routes in Next.js 13+.

## 2026-04-11
- Using `next/font/local` with variable fonts and comprehensive fallback arrays provides better font loading performance than web fonts.

## 2026-04-11
- Reflex is a Python framework that generates web UIs using Python syntax instead of React/JS, making projects built with it incompatible with React toolchains despite similar component patterns.

## 2026-04-11
- Custom toast styling with CSS selectors like `[data-sonner-toast]` and theme-specific color variables can be adapted to any toast library regardless of the underlying framework.

## 2026-04-11
- Platform-specific character limit validation using a limits dictionary and computed properties pattern is framework-agnostic and useful for social media scheduling applications.

## 2026-04-11
- Supabase realtime channel management requires careful cleanup using `supabase.removeChannel()` in useEffect returns to prevent memory leaks when switching rooms or unmounting.

## 2026-04-11
- The pattern of storing channel references in `useRef` allows for imperative operations like sending messages while maintaining the channel across re-renders.

## 2026-04-11
- Presence tracking with Supabase realtime uses `channel.presenceState()` and `Object.values(state).flat()` to extract active users from the presence state object.

## 2026-04-12 (Puck visual editor analysis)
- The PropsProvider + PuckProvider split pattern (separate context for static props vs dynamic state) prevents prop-drilling while ensuring the store is only initialized once — useful for any complex component that needs both static config and reactive state.
- Overlay positioning via createPortal to document.body + getBoundingClientRect (not position:absolute in container) is the correct approach for editor overlays and tooltips that must escape overflow:hidden parents. Sync via ResizeObserver + coalesced rAF, not setInterval.
- Page builder DnD with nested droppables requires a custom collision algorithm: elementsFromPoint() + depth sort to always resolve the deepest zone under cursor. Standard dnd-kit collision detection is not sufficient for this.
- Preview-based drag (writing to a previewIndex store, not the real data tree) allows drag cancellation without rollback — only commit to real state on dragEnd. Better than optimistic updates for complex tree structures.
- When passing a mixed-type prop object (part static, part reactive) to memoized components, use separate comparators: shallowEqual for most keys + deepEqual for the reactive prop object. See MemoizeComponent in Puck.
- Zustand slice pattern: create each logical domain (history, nodes, permissions, fields) as a separate createXxxSlice(set, get) factory that returns a plain object, then spread all slices into a single createStore() call. This keeps code organized without multiple stores.
- Two-store Zustand pattern (internal appStore + public usePuckStore) is an overcomplication for most cases. A single store with createUsePuck() factory and selectors achieves the same public API with less code.
- iframe-based preview with style sync: use MutationObserver on parent document.head + cloneNode/inline CSS rules (for cross-origin) to keep iframe styles in sync with host. createPortal into iframe's #frame-root element is the React integration point.
- walkAppState tree traversal with simultaneous index building (nodeIndex + zoneIndex) enables O(1) lookups everywhere else in the app — avoids traversing the component tree on every render.

## 2026-04-12 (react-data-table-component study)
- react-data-table-component has a hard peer dep on styled-components — this makes it incompatible with Tailwind-only projects (Omoikiri, Research Dashboard) without a two-theming-system overhead. Score 6.4 is accurate; TanStack Table + shadcn is the right choice instead.
- The `selector` + `format` split on TableColumn is a powerful pattern: `selector` drives sorting (raw value), `format` drives display (formatted string). Never couple sort logic to display formatting. Apply this to TanStack Table via separate `accessorFn` + `cell` renderer.
- `ignoreRowClick: true` on action button columns prevents the cell click from bubbling to the row click handler — critical for CRM tables where row click = open detail and button click = inline action. In TanStack Table, use `e.stopPropagation()` in the cell renderer.
- Filtering is external state: pre-filter the data array and pass `filteredItems` as `data`. The `paginationResetDefaultPage` toggle boolean resets pagination to page 1 when flipped. Equivalent in TanStack Table: reset `pageIndex` to 0 in the filter onChange handler.
- The `clearSelectedRows` boolean toggle pattern for programmatic selection clearing is cleaner than imperative ref methods: flip a boolean state value, the library watches for the change via useEffect.
- `useDidUpdateEffect` (skip-first-render hook using `useRef(true)` flag) is a reusable pattern for "fire on update, not on mount" callback props. Copy into any project that has onChange-style prop callbacks that should not fire on initial render.
- Conditional row/cell styles as `{ when: (row) => boolean, style: CSSObject }` predicate arrays are cleaner than computing class names inside column definitions. In Tailwind/shadcn tables, translate this to a `cn(baseClasses, condition && conditionalClasses)` pattern in the row/cell renderer.
- Context menu for bulk actions: when rows are selected, slide down an action bar over the table header using CSS translate3d animation. Pattern: `selectedCount > 0 ? transform(0,0,0) : transform(0,-100%,0)` with `willChange: transform`. Reusable for any multi-select table.

## 2026-04-12 (Tremor deep analysis)
- Tremor's SVG dark mode trick: set `fill=""` and `stroke=""` as empty strings on Recharts SVG primitives (XAxis, YAxis, CartesianGrid). This overrides Recharts' injected inline styles, allowing Tailwind `fill-*` and `stroke-*` CSS classes (which use `currentColor`) to work. Without the empty strings, Recharts inline styles win over CSS classes.
- `getColorClassNames(color, shade)` in Tremor returns all 12 color variants (bgColor, textColor, strokeColor, fillColor, hoverBgColor, borderColor, ringColor, etc.) at once. This function handles hex colors (`#abc`), CSS vars (`--token`), and standard Tailwind colors. Pass `colorPalette.text` (=500) for chart strokes/fills, `colorPalette.background` (=500) for fills, `colorPalette.border` (=500) for borders.
- Tremor FunnelChart is pure SVG (no Recharts) — uses `useLayoutEffect` + `getBoundingClientRect` for responsive sizing, manual bar geometry math (`useMemo`), and `foreignObject` for HTML labels inside SVG. Touch tooltip uses `reduce` to find closest bar by pixel distance from `touch.pageX`.
- `useInternalState<T>(defaultValue, valueProp)` hook: `isControlled = valueProp !== undefined`. If controlled, `setValue` is a no-op. This is the pattern for all Tremor input components to support both controlled and uncontrolled usage without duplicate code.
- Tremor's `isIncreasePositive` prop on BadgeDelta flips the color semantics: for metrics where increase is bad (e.g. response time, churn rate), set `isIncreasePositive={false}`. The `mapInputsToDeltaType` util swaps increase↔decrease internally.
- The SparkAreaChart uses `margin={{ top: 1, left: 1, right: 1, bottom: 1 }}` (1px on all sides) to prevent SVG clipping at edges. Regular AreaChart uses `top: 5` and dynamic bottom/left margins based on axis labels. Always add at least 1px margin to Recharts charts.
- BarList uses `Math.max((item.value / maxValue) * 100, 2)` — minimum 2% width so zero-adjacent bars remain visible. The `Component = onValueChange ? "button" : "div"` pattern swaps the root element type based on interactivity — correct semantic HTML without conditional rendering.
- Tremor's `tremorTwMerge` must be used (not plain `twMerge`) when merging classes that include Tremor design tokens like `rounded-tremor-default`, `shadow-tremor-card`, `text-tremor-metric`. Without the extension, tailwind-merge treats them as unknown and doesn't resolve conflicts correctly.
- `node_modules/@tremor/**` MUST be in Tailwind `content` array. Tremor generates class names dynamically (e.g. `bg-red-500` from a `color="red"` prop), so without content scanning those classes get purged in production.

## 2026-04-12 (hackertab study)
- The card registry pattern (`SUPPORTED_CARDS: SupportedCardType[]` with a `component` field + `lazyImport`) is the correct architecture for multi-source news dashboards. Adding a source = one array entry + one component. Zero changes to layout, routing, or state.
- `useLazyListLoad` — 15-line hook using IntersectionObserver with `observer.unobserve` on first intersection + TanStack Query `enabled: isVisible`. Prevents N parallel fetches on load for horizontal-scroll card layouts. Copy verbatim.
- Zustand `cardsSettings: Record<string, CardSettingsType>` — per-source filter state (language, sortBy, dateRange) stored as a flat Record keyed by source id. One store key scales to N sources without schema changes. Pair with built-in `migrate` versioning for localStorage upgrades.
- TanStack Query `staleTime: 900000 / cacheTime: 3600000` (15min/1hr) + `createAsyncStoragePersister` with localStorage adapter = full two-tier cache without any custom code. Dev mode: both set to 0 for always-fresh data.
- TanStack Query `select` option transforms data for the component without mutating the cache. Use it to inject ads, pinned items, or separators into paginated feeds — the cache stores the clean API response, the component gets the transformed version.
- dnd-kit reorder: add/remove a CSS class (`snapDisabled`) on the scroll container during `onDragStart`/`onDragEnd` to disable CSS `scroll-snap` — without this, snap fighting DnD pointer causes jitter. The drag handle is injected via a `knob` prop so the card component itself is DnD-unaware.
- `React.lazy` doesn't support named exports natively. The `lazyImport` utility (Object.create + `.then(module => ({ default: module[name] }))`) wraps it to support named exports with full TypeScript type safety. 12 lines.
- `useShallow` from Zustand is required when subscribing to multiple store keys in one selector — without it, every store update triggers a re-render even if the subscribed keys didn't change.

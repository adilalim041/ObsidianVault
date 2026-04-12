# hackertab.dev — Frontend Analysis

**Repo:** medyo/hackertab.dev
**Score:** 6.7 (News.AI relevance)
**Date:** 2026-04-12
**Stack:** React 19 + Vite 6 + TypeScript + Zustand 5 + TanStack Query 4/5 + dnd-kit + react-responsive
**Build targets:** web SPA + Chrome extension + Firefox extension (same codebase, different build scripts)

---

## Pattern 1 — Card Registry: static config array drives the entire multi-source system

**Where:** `src/config/supportedCards.tsx` + `src/features/cards/components/*Card/`

Every news source is an entry in `SUPPORTED_CARDS: SupportedCardType[]`:

```ts
{
  value: 'github',
  analyticsTag: 'github',
  label: 'Github repositories',
  component: GithubCard,          // lazy-imported React component
  icon: <SiGithub />,
  link: 'https://github.com/',
  type: 'supported',
}
```

The `DesktopCards` layout iterates this array and renders whatever `card.component` is. Adding a new source = adding one object + one component. No routing changes, no context changes, no index files to update.

Each card component is **lazy-loaded** via a custom `lazyImport` utility:

```ts
export function lazyImport<T, I extends { [K2 in K]: T }, K extends keyof I>(
  factory: () => Promise<I>,
  name: K
): I {
  return Object.create({
    [name]: React.lazy(() => factory().then((module) => ({ default: module[name] }))),
  })
}
```

This wraps `React.lazy` but supports named exports (not just `export default`). All 12+ card components are code-split automatically.

**For Research Dashboard / News.AI:** The exact same pattern works for a multi-source news feed. One registry object per source (`hackernews`, `reddit`, `producthunt`...). The source component fetches its own data, handles its own settings. Adding a source never touches existing code.

---

## Pattern 2 — Zustand + `persist` as the single source of truth for user preferences

**Where:** `src/stores/preferences.ts`

Single Zustand store, every user setting in one place: selected cards, card order, tags, theme, layout, DND duration, per-card settings (language, sortBy, dateRange), read posts visibility.

Key details:

**Per-card settings stored as a Record:**
```ts
cardsSettings: Record<string, CardSettingsType>
// access: state.cardsSettings['github'] → { language: 'typescript', sortBy: 'stars_count', dateRange: 'daily' }
```
One store key scales to N cards without schema changes.

**Built-in migration system:**
```ts
migrate: (persistedState, version) => {
  if (version === 0) {
    // rename old string tags to { label, value } objects
    // copy onboardingResult.title → occupation
  }
  return state
}
```
Version bumped in one place. Old localStorage data is upgraded automatically on first load.

**Computed getter inside store:**
```ts
isDNDModeActive: () => {
  const duration = get().DNDDuration
  if (duration === 'always') return true
  if (typeof duration === 'object') {
    return Boolean(duration.value && duration.countdown - Date.now() > 0)
  }
  return false
}
```
Derived state lives in the store, not scattered across components.

**Custom storage adapter for extension compatibility:**
```ts
storage: createJSONStorage(() => localStateStore)
```
`localStateStore` is a custom wrapper that abstracts away whether we're in a browser or extension context. TanStack Query uses the same adapter pattern via `AsyncStorage`.

**For Research Dashboard:** The dashboard already uses Zustand. The `cardsSettings` pattern (per-source settings as a Record) is worth adopting for source-specific filter state (date range, tag filter, sort).

---

## Pattern 3 — Intersection Observer for viewport-gated data fetching (useLazyListLoad)

**Where:** `src/features/cards/hooks/useLazyListLoad.tsx`

```ts
export const useLazyListLoad = ({ rootMargin } = { rootMargin: '0px' }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target) // fire-once, then stop observing
        }
      },
      { threshold: 0.1, rootMargin }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [rootMargin])

  return { ref, isVisible }
}
```

Usage in GithubCard:
```ts
const { ref, isVisible } = useLazyListLoad()

const { data, isLoading } = useGetGithubRepos({
  tags: queryTags,
  dateRange: selectedDateRange.value,
  config: { enabled: isVisible },   // TanStack Query skips fetch until visible
})

return <Card ref={ref} ...>
```

The `ref` goes on the card container. When 10% of the card enters the viewport, `isVisible` flips to `true`, which enables the TanStack Query fetch. The observer then stops watching (`unobserve`). Zero fetches for off-screen cards.

This is the correct pattern for a horizontal-scroll multi-card layout where only 3-4 cards are visible at a time. Without it, all 12+ sources fetch simultaneously on page load.

**For Research Dashboard:** If we add a multi-panel layout (GitHub Trending + HackerNews + ProductHunt side by side), this hook is copy-paste ready. 15 lines.

---

## Pattern 4 — TanStack Query with localStorage persistence as the caching layer

**Where:** `src/lib/react-query.ts` + `src/adapters/LocalStorageAdapter.tsx`

```ts
const queryConfig: DefaultOptions = {
  queries: {
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: isDevelopment() ? 0 : 900000,   // 15 min in prod
    cacheTime: isDevelopment() ? 0 : 3600000,  // 1 hour in prod
  },
}

export const persister = createAsyncStoragePersister({
  storage: localStorageAdapter,   // wraps window.localStorage as AsyncStorage
})
```

The `persister` is passed to `PersistQueryClientProvider` at the app root. This means:
- First visit → fetches from API, stores in localStorage
- Page reload within 1 hour → serves from localStorage, no network call
- After 15 minutes the data is "stale" but still shown while revalidating in background
- Dev mode → caches disabled (staleTime=0, cacheTime=0) so you always see fresh data

The ResponseInterceptor unwraps `response.data` so every query function returns the payload directly (no `response.data.data` chains):
```ts
export const ResponseInterceptor = (response: AxiosResponse): AxiosResponse => {
  return response.data
}
```

**For News.AI dashboard and Research Dashboard:** This is the same two-tier caching approach documented in our learnings (in-memory Map + localStorage). Here TanStack Query handles both tiers automatically. The `staleTime` / `cacheTime` combo is the configuration to copy: 15 min stale, 1 hour cache. Matches our GitHub API rate-limit mitigation pattern.

---

## Pattern 5 — dnd-kit for drag-to-reorder cards with snap-disable during drag

**Where:** `src/components/Layout/DesktopCards.tsx`

The card reorder uses `@dnd-kit/core` + `@dnd-kit/sortable`. Key implementation details:

**Snap scroll disabled during drag:**
```ts
const handleDragStart = () => {
  cardsWrapperRef.current?.classList.add('snapDisabled')  // CSS removes scroll-snap
}
const handleDragEnd = (event) => {
  // ... reorder logic ...
  cardsWrapperRef.current?.classList.remove('snapDisabled')
}
```
Without this, CSS scroll-snap fights with DnD pointer tracking and creates jittery behavior.

**SortableItem renders the actual card component:**
```ts
const SortableItem = ({ id, card, withAds }) => {
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({ id })
  const Component = card.component || CustomRssCard

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <Component
        meta={card}
        className={clsx(isDragging && 'draggedBlock')}
        knob={
          <DesktopBreakpoint>
            <button className="blockHeaderDragButton" {...attributes} {...listeners}>
              <MdOutlineDragIndicator />
            </button>
          </DesktopBreakpoint>
        }
      />
    </div>
  )
}
```

The `knob` prop passes the drag handle into the card header — the card itself doesn't know about DnD. The drag handle is desktop-only (wrapped in `DesktopBreakpoint`).

**Order persisted to Zustand:**
```ts
updateCardOrder: (prevIndex, newIndex) =>
  set((state) => {
    const updated = [...state.cards]
    const [movedItem] = updated.splice(prevIndex, 1)
    updated.splice(newIndex, 0, movedItem)
    return { cards: updated.map((card, index) => ({ ...card, id: index })) }
  })
```
Indices are reassigned after every reorder so they stay sequential. Zustand `persist` writes it to localStorage.

**For Research Dashboard:** If we add user-configurable source panels, this is the full drag-to-reorder implementation. The pattern is clean — card component is DnD-unaware, handle is injected via props.

---

## Pattern 6 — Responsive breakpoint providers (DesktopBreakpoint / MobileBreakpoint)

**Where:** `src/providers/DesktopBreakpoint.tsx`, `src/providers/MobileBreakpoint.tsx`

```ts
export const DesktopBreakpoint = ({ children }) => {
  const isDesktop = useMediaQuery({ minWidth: 768 })
  return isDesktop ? children : null
}
```

Used as layout wrappers throughout:
```tsx
<DesktopBreakpoint>
  <DesktopCards cards={cards} />
</DesktopBreakpoint>
<MobileBreakpoint>
  <MobileCards selectedCard={selectedCard} />
</MobileBreakpoint>
```

This is cleaner than `hidden md:block` Tailwind utilities when the two layouts have completely different component trees (DesktopCards vs MobileCards with bottom navigation). CSS hides elements but still renders them — `react-responsive` prevents rendering entirely.

The same pattern wraps the drag handle (desktop-only) and card settings button position.

---

## Pattern 7 — Feed with ad injection via TanStack Query `select` transform

**Where:** `src/features/feed/components/Feed.tsx`

```ts
const { data: feed } = useGetFeed({
  tags: userSelectedTags.map(t => t.label.toLowerCase()),
  config: {
    select: (data) => ({
      ...data,
      pages: data.pages.map((page, pageIndex) => {
        const result: FeedItemData[] = []
        page.data.forEach((item, index) => {
          if (pageIndex === 0 && index === 3) {
            result.push({ type: 'ad', id: `ad-${pageIndex}-${index}` })
          }
          result.push(item)
        })
        return { ...page, data: result }
      }),
    }),
  },
})
```

The `select` option in TanStack Query transforms data without mutating the cache. The ad object (`{ type: 'ad' }`) is injected into position 4 of the first page before rendering. The cache still stores the original clean data — only the component receives the transformed version.

Infinite scroll is handled by `react-infinite-scroll-hook` with `rootMargin: '0px 0px 100% 0px'` — loads next page one full viewport ahead.

**For News.AI:** The `select` transform pattern is useful for injecting sponsored/promoted content, pinned items, or "read later" separators into a feed without polluting the API cache.

---

## Summary: applicability to Adil's projects

### Research Dashboard (Nexus research panel)

| Pattern | Status | Notes |
|---|---|---|
| Card registry (Pattern 1) | **Adopt directly** | Replace current source hard-coding with a `SUPPORTED_SOURCES` array. Each source = lazy component. |
| useLazyListLoad (Pattern 3) | **Adopt directly** | 15-line hook, zero deps beyond React. Prevents 12+ parallel fetches on load. |
| TanStack Query persistence (Pattern 4) | **Already partially in use** | Bump staleTime to 15min, cacheTime to 1hr. Wire up `createAsyncStoragePersister`. |
| dnd-kit reorder (Pattern 5) | **Future** | When user-configurable source panels are added. |
| Breakpoint providers (Pattern 6) | **Consider** | Current dashboard is desktop-only; revisit when mobile is needed. |

### News.AI dashboard

| Pattern | Status | Notes |
|---|---|---|
| `cardsSettings` Record in Zustand (Pattern 2) | **Adopt** | Per-niche filter state (date range, language) stored as `Record<nicheId, settings>`. |
| Feed ad injection via `select` (Pattern 7) | **Relevant** | Can inject promoted articles or pipeline status items into feeds without touching cache. |
| RemoteConfig pattern | **Note** | hackertab fetches `/data/config.json` on startup and persists it to Zustand. Clean way to push tag/feature config from server without a full deploy. |

---

## Notable implementation details

- **`lazyImport` utility** (Pattern 1): wraps `React.lazy` for named exports. Standard in bulletin-board style apps — code-splits each source card.
- **`useShallow`** from Zustand: used in `useSelectedTags` to prevent re-renders when unrelated store slices update. Essential when subscribing to multiple store keys.
- **`localStorage.canUseLocalStorage()` guard**: all localStorage writes wrapped in try/catch with availability check. Needed because extensions can run in contexts where localStorage is blocked.
- **Dual build system**: same React source compiles to web SPA (`VITE_BUILD_TARGET=web`) and browser extension (`VITE_BUILD_TARGET=extension`). Environment-specific providers (auth handles both `chrome.runtime.onMessage` and URL param token delivery).
- **MutationObserver on `document.documentElement`**: Card.tsx watches for `dndState` class on html element to disable ads during DND mode. The class is toggled by an IntersectionObserver in App.tsx watching the DND content section.

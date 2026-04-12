# Deep Study: Puck

**URL:** https://github.com/measuredco/puck
**Studied:** 2026-04-12
**Original candidate:** [[candidates/2026-04-10-measuredco-puck.md]]
**Score (parser):** 8.2/10
**Deep Score:** 8.5/10
**Stack:** React 18/19, Zustand 5, @dnd-kit/react, Tiptap 3, CSS Modules, @tanstack/react-virtual, tsup, Turborepo, Lerna
**Architecture:** monorepo (library)
**LOC:** ~15,000+ (core package)
**Status:** studied
**Recommendation:** watch

## Architecture Summary

Puck is a visual page builder that lets non-technical users drag and drop React components to build pages. The core package (`packages/core`) exports a `<Puck>` editor component and a `<Render>` renderer. It's a monorepo with 6 publishable packages, managed by Yarn 1 + Lerna 9 + Turborepo 2.

The editor architecture splits into two layers:
1. **Config layer** (PropsProvider) — static configuration passed via React Context (component definitions, fields, permissions). Doesn't change during editing.
2. **State layer** (Zustand appStore) — reactive editing state (selected items, component data, history). Built using slice pattern with `subscribeWithSelector`.

Drag & drop uses `@dnd-kit/react` with a custom `NestedDroppablePlugin` that resolves nested drop targets by depth. Preview rendering happens inside an `<AutoFrame>` (iframe) with MutationObserver-based style synchronization. The overlay system uses `createPortal` to `document.body` with rAF-throttled position sync.

## File Map

```
packages/core/
├── components/
│   ├── Puck/           — main editor, compound API (Puck.Fields, Puck.Preview)
│   ├── AutoField/      — dynamic form field registry
│   ├── AutoFrame/      — iframe isolation for preview
│   ├── DragDropContext/ — dnd-kit wrapper + NestedDroppablePlugin
│   ├── DraggableComponent/ — individual draggable with overlay
│   ├── DropZone/       — nested droppable zones
│   ├── Canvas/         — viewport with zoom controls
│   └── LayerTree/      — component hierarchy sidebar
├── lib/
│   ├── data/           — state transformations (insert, remove, move, reorder)
│   ├── dnd/            — custom dnd-kit plugins
│   └── resolve-all-data.ts — async data resolution
├── store/              — Zustand slices (history, nodes, permissions, fields)
├── types.tsx           — generic Config<> type system
└── bundle/             — 4 entry points (full, rsc, internal, no-external)
```

## Quality Assessment

- Code quality: 8/10 — well-structured, consistent patterns, good separation of concerns
- TypeScript/types: 7/10 — generics used for Config but some `any` casts remain
- Test coverage: 5/10 — visual E2E tests with Playwright but limited unit tests
- Documentation: 7/10 — good README, but inline comments sparse in complex areas
- Dependency hygiene: 6/10 — ESLint 7 (EOL), Yarn 1 (legacy), mixed Next.js versions

## Relevance to Adil's Projects

- **Omoikiri dashboard:** The Zustand slice pattern and compound component API are directly applicable for complex dashboard state. The AutoField registry pattern is perfect for dynamic forms.
- **Research Dashboard:** The overlay positioning system (rAF + ResizeObserver) could improve the Voronoi map tooltips. The MemoizeComponent pattern with selective deep equality is useful for candidate card lists.
- **Nexus:** Not directly applicable (Python bot, no React frontend).

## Subagent Reports

- [Frontend analysis](frontend.md) — 23 files, 8 patterns with full code
- [Infra analysis](infra.md) — 28 files, monorepo + CI/CD + build system
- [Extracted patterns](patterns.md) — 5 reusable patterns ready to adapt
- [Final verdict](verdict.md) — recommendation + action items

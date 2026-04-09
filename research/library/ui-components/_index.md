# Library: UI Components

> React component libraries that solve "Claude draws boxes and circles instead of real UI". All MIT/permissive, all production-grade.

## Cards

- [shadcn-ui.md](shadcn-ui.md) — **THE one to use first.** Copy-paste React components, owned by you, MIT. Buttons, forms, dialogs, tables, sidebars, dashboards.
- [radix-ui.md](radix-ui.md) — Low-level accessible primitives that shadcn is built on. Use directly when shadcn isn't enough.
- [tremor.md](tremor.md) — Dashboard-specific: charts, KPI cards, metrics. **Critical for Omoikiri.AI sales reports and AdilFlow analytics.**
- [tailwind-ui.md](tailwind-ui.md) — Premium (paid) Tailwind blocks. Worth knowing about, can wait.
- [mantine.md](mantine.md) — Alternative full design system if shadcn doesn't fit a specific case.
- [tanstack-table.md](tanstack-table.md) — The data-table library everyone uses. Headless, pairs with shadcn.

## Recommended starter stack for Adil's dashboards

```
React + Vite + Tailwind + shadcn/ui + Tremor + TanStack Table + Lucide icons
```

This is the de facto standard for modern admin dashboards in 2025-2026. Everything MIT, everything composable.

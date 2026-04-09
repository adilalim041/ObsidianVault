# TanStack Table

## What it is

A **headless** (no UI) table library for React. Provides all the logic for sorting, filtering, pagination, grouping, row selection, column resizing, virtualization — but you bring your own markup and styling.

## License

**MIT.**

## Used for

- **Omoikiri.AI** — contacts table, conversations table, deals table
- **News.AI** — content queue, publish history, source list

Pairs perfectly with shadcn/ui — shadcn even has a `data-table` example showing exactly how to combine them.

## Why it matters

Tables are the most common dashboard component and the hardest to get right. Sorting + filtering + pagination + row actions = a lot of state management. TanStack Table handles it all; you just render rows.

## How to use

```bash
npm i @tanstack/react-table
```

shadcn provides a ready-made data-table component built on TanStack:

```bash
npx shadcn@latest add table
# Then follow https://ui.shadcn.com/docs/components/data-table
```

## Score: 9/10 for Adil

If there's a table in any dashboard, use this. Don't roll your own.

## Alternatives

- **Material React Table** — opinionated, Material styled
- **AG Grid** — enterprise-grade, but the free version is limited
- **react-table v7** — older API, deprecated in favor of TanStack Table v8

## Links

- https://tanstack.com/table
- shadcn data-table example: https://ui.shadcn.com/docs/components/data-table

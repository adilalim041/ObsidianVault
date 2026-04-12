# react-data-table-component — Frontend Analysis

**Repo:** jbetancur/react-data-table-component
**Version analyzed:** 7.7.0
**Date:** 2026-04-12
**Score:** 6.4 (library score from research index)
**License:** Apache-2.0

---

## Overview

A declarative, batteries-included React data table. Not headless — it ships its own markup and styles via `styled-components`. This is the key architectural difference from TanStack Table (which is headless). The trade-off: faster to drop in, harder to restyle for Tailwind/shadcn projects.

**Core deps:**
- `styled-components >= 5` (peer dep, not optional) — this alone is a blocker for Omoikiri/Research Dashboard (both use Tailwind)
- `deepmerge` — only runtime dependency, used for theme merging

---

## Architecture

```
DataTable.tsx           — root component, React.memo wrapped generic DataTable<T>
tableReducer.ts         — pure reducer for all table state
useColumns.ts           — column decoration + drag-reorder logic
types.ts                — all TypeScript types (TableProps<T>, TableColumn<T>, etc.)
styles.ts               — createStyles() merges theme → defaultStyles → customStyles
themes.ts               — createTheme() registers named themes into a global registry
defaultProps.tsx        — all prop defaults in one object (the pattern is good to copy)
```

State is managed by a single `useReducer` at the `DataTable` root. All action types are discriminated unions (`Action<T>`). No external state library.

---

## Pattern 1: Typed reducer with discriminated union actions

All mutable state lives in one `TableState<T>` shape. Every interaction dispatches a typed action:

```ts
type Action<T> =
  | AllRowsAction<T>      // SELECT_ALL_ROWS
  | SingleRowAction<T>    // SELECT_SINGLE_ROW
  | MultiRowAction<T>     // SELECT_MULTIPLE_ROWS
  | SortAction<T>         // SORT_CHANGE
  | PaginationPageAction  // CHANGE_PAGE
  | PaginationRowsPerPageAction // CHANGE_ROWS_PER_PAGE
  | ClearSelectedRowsAction;   // CLEAR_SELECTED_ROWS
```

The reducer is a pure function in its own file. This makes the state transitions completely testable without mounting the component.

**Omoikiri application:** Adopt this pattern for the contacts/chats table state in wa-dashboard. Sort state + selected rows + page state all belong in one reducer, not three separate `useState` calls.

**Research Dashboard application:** The candidates table already has sort/filter/page state scattered across hooks. Consolidating into a single reducer would simplify the `useCandidates` hook.

---

## Pattern 2: `cell` vs `selector`+`format` — two ways to customize columns

Every `TableColumn<T>` supports two distinct rendering modes:

```ts
// Mode A: selector + optional format (for sortable data)
{
  name: 'Lead Temperature',
  selector: row => row.lead_temperature,  // used for sorting
  sortable: true,
  format: row => row.lead_temperature.toUpperCase(), // display override (does not affect sort)
}

// Mode B: cell render prop (full control, disables overflow handling)
{
  name: 'Actions',
  button: true,
  ignoreRowClick: true,
  allowOverflow: true,
  cell: (row, rowIndex, column, id) => (
    <Button onClick={() => handleAction(row)}>Open</Button>
  ),
}
```

The `format` prop is underused by most developers. It lets you format display (e.g., dates, truncation) while keeping the raw value for sorting — you don't need a full `cell` render prop just to change how text looks.

`ignoreRowClick: true` on action button columns prevents the button click from also triggering `onRowClicked` on the parent row. **Critical for CRM contact tables where row click = open detail and button click = inline action.**

**Omoikiri:** Contact table needs `cell` for avatar+name combo, `format` for date columns (sort by timestamp, display as "2 hours ago"), `button: true` + `ignoreRowClick: true` for quick-action buttons per row.

---

## Pattern 3: Filtering is external state, not a table prop

Unlike many table libraries, there is **no built-in `filter` prop**. Filtering works by passing pre-filtered data:

```tsx
const [filterText, setFilterText] = useState('');
const [resetPaginationToggle, setResetPaginationToggle] = useState(false);

const filteredItems = data.filter(item =>
  item.name?.toLowerCase().includes(filterText.toLowerCase())
);

const subHeaderComponent = useMemo(() => {
  const handleClear = () => {
    if (filterText) {
      setResetPaginationToggle(prev => !prev); // resets pagination to page 1
      setFilterText('');
    }
  };
  return <FilterInput value={filterText} onChange={e => setFilterText(e.target.value)} onClear={handleClear} />;
}, [filterText, resetPaginationToggle]);

<DataTable
  data={filteredItems}
  subHeader
  subHeaderComponent={subHeaderComponent}
  paginationResetDefaultPage={resetPaginationToggle}
/>
```

The `paginationResetDefaultPage` boolean toggle is a deliberate design: flipping it resets pagination to page 1 whenever filter changes. You pass a new boolean value (toggle state) — the library watches for changes via `useDidUpdateEffect`.

**This pattern is cleaner than it looks.** By keeping filter state outside the table, you can apply multiple filter conditions (by name AND by tag AND by stage) without any special table API — just compose your `.filter()` chain.

---

## Pattern 4: Expandable rows with full component injection

Expandable rows render an arbitrary React component with access to the full row data:

```tsx
const ExpandedContact = ({ data }) => (
  <div className="p-4 bg-muted">
    <p>Phone: {data.phone}</p>
    <p>Notes: {data.notes}</p>
    <p>AI Summary: {data.ai_summary}</p>
  </div>
);

<DataTable
  expandableRows
  expandableRowsComponent={ExpandedComponent}
  expandableRowExpanded={row => row.id === preExpandedId} // control which rows start expanded
  expandableRowDisabled={row => !row.has_details}         // disable expander for rows without details
  expandOnRowClicked={false}     // don't expand on row click
  expandOnRowDoubleClicked={false}
  expandableInheritConditionalStyles={true} // expanded row gets same conditional styles as parent row
/>
```

The `ExpanderComponent` receives `{ data: T }` plus any extra props you pass via `expandableRowsComponentProps`.

Row-level expand state is managed locally in `TableRow` via `useState(defaultExpanded)`, synced to `defaultExpanded` prop via `useEffect`. This means expansion is controlled at the row level, not globally — but you can control initial state per row via `expandableRowExpanded`.

**Omoikiri application:** Chats table with expandable row showing the last 3 messages + AI analysis summary. Contacts table with expandable row showing `consultation_details` jsonb from `chat_ai` table.

**Research Dashboard:** Candidates table expandable row showing the study file content (when a study exists) — eliminates the need to navigate to a separate detail page for quick review.

---

## Pattern 5: Context menu for bulk actions on selected rows

When `selectableRows` is enabled and rows are selected, a context menu slides down over the table header (CSS translate3d animation). It shows selected count + context action buttons:

```tsx
const deleteAction = (
  <Button key="delete" onClick={() => handleDeleteSelected(selectedRows)}>
    Delete Selected
  </Button>
);

const tagAction = (
  <Button key="tag" onClick={() => handleTagSelected(selectedRows)}>
    Tag Selected
  </Button>
);

<DataTable
  selectableRows
  contextMessage={{ singular: 'contact', plural: 'contacts', message: 'selected' }}
  contextActions={[deleteAction, tagAction]}
  onSelectedRowsChange={({ selectedRows, selectedCount, allSelected }) => {
    setSelectedRows(selectedRows);
  }}
  clearSelectedRows={clearToggle} // flip this boolean to programmatically clear selection
/>
```

The context menu position is `absolute` over the header — it uses `transform: translate3d(0, -100%, 0)` → `translate3d(0, 0, 0)` transition when `selectedCount > 0`. The `willChange: transform` hint is already set.

You can replace the entire context menu with a custom component via `contextComponent` — it receives `selectedCount` via `React.cloneElement`.

**Omoikiri:** Bulk tag assignment or bulk stage change for contacts/chats. The CRM workflow often requires "select all in Warm stage → bulk move to Hot" — this pattern handles it.

---

## Pattern 6: Conditional row and cell styling

Two levels of conditional styling:

**Row level** — applies to entire row:
```tsx
conditionalRowStyles={[
  {
    when: row => row.lead_temperature === 'hot',
    style: { backgroundColor: 'rgba(255, 0, 0, 0.1)', borderLeft: '4px solid red' },
    classNames: ['hot-lead-row'],  // also adds CSS classes
  },
  {
    when: row => row.risk_flags?.length > 0,
    style: row => ({ opacity: row.is_archived ? 0.5 : 1 }), // style can be a function of row
  },
]}
```

**Cell level** — applies per-column per-row, defined on the column object:
```tsx
{
  name: 'Lead Score',
  selector: row => row.consultation_score,
  conditionalCellStyles: [
    { when: row => row.consultation_score >= 8, style: { backgroundColor: 'rgba(63,195,128,0.9)', color: 'white' } },
    { when: row => row.consultation_score >= 5, style: { backgroundColor: 'rgba(248,148,6,0.9)', color: 'white' } },
    { when: row => row.consultation_score < 5,  style: { backgroundColor: 'rgba(242,38,19,0.9)', color: 'white' } },
  ],
}
```

**Important:** `style` can be either a `CSSObject` or a `(row: T) => CSSObject` function — useful when the style value depends on the row data (e.g., opacity based on `is_archived`).

---

## Pattern 7: Server-side pagination

The library cleanly separates client-side and server-side pagination:

```tsx
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const [totalRows, setTotalRows] = useState(0);
const [perPage, setPerPage] = useState(10);

const fetchPage = async (page, perPage) => {
  setLoading(true);
  const res = await supabase
    .from('contacts_crm')
    .select('*', { count: 'exact' })
    .range((page - 1) * perPage, page * perPage - 1);
  setData(res.data);
  setTotalRows(res.count);
  setLoading(false);
};

<DataTable
  data={data}
  columns={columns}
  progressPending={loading}
  pagination
  paginationServer                         // disables client-side slice
  paginationTotalRows={totalRows}          // required for page count calculation
  onChangePage={page => fetchPage(page, perPage)}
  onChangeRowsPerPage={(newPerPage, page) => {
    setPerPage(newPerPage);
    fetchPage(page, newPerPage);
  }}
/>
```

When `sortServer` is also set, `onSort` fires with `(column, direction, sortedData)` so you can issue a sorted query. When `paginationServerOptions.persistSelectedOnPageChange: true`, selected rows survive page changes (needed for "select all across pages" UX).

**Omoikiri:** The `contacts_crm` and `chats` tables in Supabase can have hundreds of rows per session. Server-side pagination prevents loading everything upfront.

---

## Pattern 8: Column drag-reorder via HTML5 Drag API

Built-in column reordering using native HTML5 drag events (no extra library):

```tsx
{
  name: 'Name',
  selector: row => row.name,
  reorder: true, // adds draggable attribute
}

<DataTable
  columns={columns}
  onColumnOrderChange={cols => saveColumnOrder(cols)} // persist order
/>
```

Implemented in `useColumns.ts` using `sourceColumnId` ref + array swap on `dragEnter`. The swap is immediate (live preview during drag), committed to `onColumnOrderChange` callback on each swap — not just on drop.

**Note:** The swap-on-enter behavior means rapid drags can reorder more than intended. For production use in Omoikiri, persist column order to localStorage or Supabase `session_config`.

---

## Pattern 9: useDidUpdateEffect — skip first render

Custom hook pattern that appears throughout the library for "fire on update, not on mount":

```ts
const useDidUpdateEffect: Hook = (fn, inputs) => {
  const firstUpdate = useRef(true);
  useEffect(() => {
    if (firstUpdate.current) {
      firstUpdate.current = false;
      return;
    }
    fn();
  }, inputs);
};
```

Used for: `onSort` callback, `onChangePage` callback, `onChangeRowsPerPage` callback, `onSelectedRowsChange` callback. All of these should not fire on initial render — only on user interaction. **Copy this hook into any project that has "fire on change only" semantics.**

---

## Pattern 10: deepmerge-based theming system

Themes are registered globally (module-level mutable map) and merged via `deepmerge`:

```ts
// Register a new theme inheriting from 'dark'
createTheme('solarized', {
  text: { primary: '#268bd2' },
  background: { default: '#002b36' },
  divider: { default: '#073642' },
}, 'dark'); // <-- inherit from dark

// Use it
<DataTable theme="solarized" />
```

`createStyles(customStyles, themeName)` deep-merges `defaultStyles(theme)` + `customStyles`, so you can override individual style keys without replacing the whole definition:

```ts
const customStyles = {
  rows: {
    style: { minHeight: '40px' },          // override just minHeight
    highlightOnHoverStyle: { backgroundColor: '#f5f5f5' },
  },
  headCells: {
    style: { fontWeight: 700, fontSize: '13px' },
  },
};

<DataTable customStyles={customStyles} />
```

**Integration with Tailwind projects:** The `customStyles` prop accepts CSSObject (plain JS objects), not class names. To adapt for Tailwind-based projects, you'd need to use CSS custom properties as the bridge — set `var(--background)` etc. from your Tailwind theme in the CSSObject values.

---

## Verdict for Adil's Projects

### Omoikiri wa-dashboard

**Score for this use case: 5/10** — usable but not ideal.

Blockers:
- Hard dependency on `styled-components`. Omoikiri dashboard uses Tailwind. Mixing both adds ~30KB to the bundle and creates a two-theming-system problem.
- Dark mode requires creating a custom theme via `createTheme()` with hardcoded color values. Tailwind's dark mode (CSS classes) does not automatically apply inside styled-components.
- `customStyles` prop takes CSSObject, not Tailwind classes — you lose all Tailwind design tokens.

Positives worth adopting conceptually:
- The `cell` + `ignoreRowClick` pattern for action buttons in CRM rows
- Server-side pagination API design for Supabase queries
- Context menu for bulk actions
- `conditionalRowStyles` for lead temperature color-coding

**Recommendation:** Use **TanStack Table + shadcn/ui data-table** instead (already in library). The patterns learned here (server-side pagination, conditional styles, cell render props) are all available in TanStack Table with full Tailwind compatibility. Score 6.4 is accurate — this library was better before TanStack Table v8 existed.

### Research Dashboard (candidate tables)

**Same verdict.** Research Dashboard is Vite + Tailwind + shadcn. The styled-components conflict applies equally.

**One exception:** If there's a time constraint and you need a table in < 1 hour with zero styling effort, `react-data-table-component` with `theme="dark"` and minimal `customStyles` can work as a prototype. It is genuinely fast to get functional. Just plan to migrate to TanStack Table before production.

---

## Patterns to extract regardless of library choice

These are **design patterns** learned from this codebase that apply to any table implementation:

1. **Single reducer for all table state** — sort + pagination + selection in one `useReducer`
2. **`selector` for sort value, `format` for display** — never couple sort logic to display formatting
3. **Filter outside the table** — pre-filter data array, use `paginationResetDefaultPage` equivalent to reset page
4. **`ignoreRowClick` on action cells** — prevents event bubbling to row handler
5. **`useDidUpdateEffect`** — skip-first-render hook for callback props
6. **Conditional styles as `when` predicates** — cleaner than computing class names in the column definition
7. **`clearSelectedRows` toggle pattern** — use a boolean state flip to programmatically clear selection, not an imperative method call

# blocks — Frontend Analysis

**Repo:** ephraimduncan/blocks
**Date:** 2026-04-12
**Score:** 8.2 | MIT
**Stack:** Next.js 15, React 19, Tailwind CSS v4, shadcn/ui (new-york style), Radix UI, Recharts, Lucide + Tabler icons

---

## What this is

A copy-paste component registry — like a curated extension of shadcn/ui. Each block is a self-contained, production-ready page section. 72+ blocks across 11 categories: Login (9), Dialogs (12), Stats (15), Sidebars (6), AI chat (5), Tables (5), Onboarding (7), Forms (5), File Upload (6), Command Menus (3), Grid Lists (3).

No install step. You copy the file. Zero lock-in.

---

## Registry architecture

### How blocks are registered

Three-file system:

1. `content/declarations.ts` — types + categoryIds enum
2. `content/blocks-metadata.ts` — array of `BlocksMetadata[]` with `id`, `category`, `name`, `iframeHeight`, `type` (file | directory)
3. `content/blocks-components.tsx` — flat map of `blocksId → React.ElementType`

```ts
// declarations.ts
export type BlocksMetadata = {
  id: string;
  category: string;
  name: string;
  iframeHeight?: string;
  type: "file" | "directory"; // "directory" = multi-file block (sidebars)
};

export const categoryIds: { [key: string]: string } = {
  Login: "login",
  Stats: "stats",
  Dialogs: "dialogs",
  // ...
};
```

```ts
// blocks-components.tsx — flat id → component map
export const blocksComponents: { [blocksId: string]: React.ElementType } = {
  "login-01": components.Login01,
  "stats-07": components.Stats07,
  // ...
};
```

Category counts are computed automatically at build time via `countByCategory(blocksMetadata)` — no manual sync needed.

**Multi-file blocks** (sidebars) are `type: "directory"` and live in their own folder with `app-sidebar.tsx`, `nav-main.tsx`, `nav-footer.tsx`, `types.ts`, etc.

**Omoikiri/Research Dashboard takeaway:** Adopt this exact registry pattern for any component showcase or internal UI library — metadata array + flat component map is cleaner than importing from barrel files and supports iframe previews.

---

## Pattern 1: Stats grid with `gap-px` border trick

**File:** `content/components/stats/stats-01.tsx`

The cards share borders without border doubling — the parent grid uses `bg-border` + `gap-px`, making the gap itself the border:

```tsx
<div className="mx-auto grid grid-cols-1 gap-px rounded-xl bg-border sm:grid-cols-2 lg:grid-cols-4">
  {data.map((stat, index) => (
    <Card
      key={stat.name}
      className={cn(
        "rounded-none border-0 shadow-none py-0",
        index === 0 && "rounded-l-xl",
        index === data.length - 1 && "rounded-r-xl"
      )}
    >
      <CardContent className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 p-4 sm:p-6">
        <div className="text-sm font-medium text-muted-foreground">{stat.name}</div>
        <div className={cn(
          "tabular-nums text-xs font-medium",
          stat.changeType === "positive"
            ? "text-green-800 dark:text-green-400"
            : "text-red-800 dark:text-red-400"
        )}>
          {stat.change}
        </div>
        <div className="tabular-nums w-full flex-none text-3xl font-medium tracking-tight text-foreground">
          {stat.value}
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

Key details:
- `gap-px` + `bg-border` = hairline borders between cards for free, no border management
- `rounded-none` on cards, `rounded-l-xl` first, `rounded-r-xl` last — preserves container radius
- `tabular-nums` on numbers to prevent layout shift when digits change
- `items-baseline justify-between` + `flex-wrap` handles label + badge + value gracefully

**Omoikiri use:** Direct copy for the funnel KPI row (Leads / Qualified / Hot / Closed). Replace `changeType` with `trend` prop.

---

## Pattern 2: Collapsible sidebar with `group-data-[state=...]` Tailwind variant

**File:** `content/components/sidebar/sidebar-01/nav-collapsible.tsx`

Uses shadcn Collapsible + SidebarGroup. The chevron rotation is driven purely by Tailwind data-attribute variants, no JS state:

```tsx
<Collapsible defaultOpen className="group/collapsible">
  <SidebarGroup>
    <SidebarGroupLabel
      asChild
      className="text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      <CollapsibleTrigger>
        Favorites
        <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
      </CollapsibleTrigger>
    </SidebarGroupLabel>
    <CollapsibleContent>
      <SidebarGroupContent>
        <SidebarMenu>
          {favorites.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton asChild>
                <a href={item.href} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded ${item.color}`} />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </CollapsibleContent>
  </SidebarGroup>
</Collapsible>
```

Key patterns:
- `group/collapsible` + `group-data-[state=open]/collapsible:rotate-180` — Tailwind group variant with named group scope. No `useState` for open/close.
- `SidebarGroupLabel asChild` passes trigger behavior into the label, making the whole label row the click target
- Color-dot items use `bg-green-400 dark:bg-green-300` — separate light/dark shades because greens look different on white vs dark

**Omoikiri use:** The CRM sidebar has Tags and Sessions sections that can collapse. Copy this pattern directly. The named group scope (`group/collapsible`) is essential when multiple collapsibles exist in the same sidebar.

---

## Pattern 3: Dialog with two-pane layout (description left, form right)

**File:** `content/components/dialogs/dialog-11.tsx`

A dialog that splits content into a description/context pane and a form pane. Works as a multi-step wizard or complex configuration modal:

```tsx
<DialogContent className="overflow-visible p-0 sm:max-w-2xl gap-0">
  <DialogHeader className="border-b px-6 py-4 mb-0">
    <DialogTitle>Initialize New Project</DialogTitle>
  </DialogHeader>

  <form action="#" method="POST">
    <div className="flex flex-col-reverse md:flex-row">
      {/* Left: description + footer actions */}
      <div className="flex flex-col justify-between md:w-80 md:border-r">
        <div className="flex-1 grow">
          <div className="border-t p-6 md:border-none">
            {/* icon + description */}
          </div>
        </div>
        <div className="flex items-center justify-between border-t p-4">
          <DialogClose asChild>
            <Button type="button" variant="ghost">Cancel</Button>
          </DialogClose>
          <Button type="submit" size="sm">Initialize</Button>
        </div>
      </div>

      {/* Right: numbered form fields */}
      <div className="flex-1 space-y-6 p-6 md:px-6 md:pb-8 md:pt-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="inline-flex size-6 items-center justify-center rounded-sm bg-muted text-sm text-foreground">
              1
            </div>
            <Label htmlFor="framework">Select Framework</Label>
          </div>
          <Select defaultValue="react">...</Select>
        </div>
        {/* steps 2, 3, 4 */}
      </div>
    </div>
  </form>
</DialogContent>
```

Key patterns:
- `flex-col-reverse md:flex-row` — on mobile, form fields come first (visible without scroll), description second. On desktop side by side.
- `p-0` on DialogContent, manual padding per section — allows full-bleed header and footer
- Numbered steps: `inline-flex size-6 ... rounded-sm bg-muted` — pure CSS step counter, no library
- `DialogClose asChild` + ghost Button — accessible close without default X button behavior conflict

**Omoikiri use:** "Create CRM Contact" dialog that explains what fields mean on the left while the user fills in on the right. Also Research Dashboard's "Add study" workflow.

---

## Pattern 4: Stat card with inline Recharts area sparkline

**File:** `content/components/stats/stats-10.tsx`

Each stat card embeds a small area chart as visual context — the chart height is 64px, axes hidden:

```tsx
<Card key={item.name} className="p-0 shadow-2xs">
  <CardContent className="p-4 pb-0">
    <dt className="text-sm font-medium text-foreground">{item.name}</dt>
    <div className="flex items-baseline justify-between">
      <dd className={cn(
        item.changeType === "positive" ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500",
        "text-lg font-semibold"
      )}>
        {item.value}
      </dd>
      <dd>
        <span className="font-medium text-foreground">{item.change}</span>
        <span className={...}>({item.percentageChange})</span>
      </dd>
    </div>

    <div className="mt-2 h-16 overflow-hidden">
      <ChartContainer className="w-full h-full" config={{ [item.name]: { color } }}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide={true} />
          <Area
            dataKey={item.name}
            stroke={color}
            fill={`url(#${gradientId})`}
            fillOpacity={0.4}
            strokeWidth={1.5}
            type="monotone"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  </CardContent>
</Card>
```

The `gradientId` is derived from `sanitizeName(item.name)` to avoid SVG id collisions when multiple charts render on the same page.

**Omoikiri use:** Lead temperature cards — each contact's "heat" over the last 7 days as a sparkline. Also Research Dashboard's candidate score trend cards.

---

## Pattern 5: Radial progress stat (quota/usage visualization)

**File:** `content/components/stats/stats-07.tsx`

Shows plan usage per resource with a small radial bar chart. The percentage text is absolutely centered over the chart:

```tsx
<Card key={item.name} className="p-4 shadow-2xs">
  <CardContent className="p-0 flex items-center space-x-4">
    <div className="relative flex items-center justify-center">
      <ChartContainer config={chartConfig} className="h-[80px] w-[80px]">
        <RadialBarChart
          data={[item]}
          innerRadius={30}
          outerRadius={60}
          barSize={6}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} axisLine={false} />
          <RadialBar dataKey="capacity" background cornerRadius={10} fill="var(--primary)" angleAxisId={0} />
        </RadialBarChart>
      </ChartContainer>
      {/* Centered label — absolute inset-0 trick */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-base font-medium text-foreground">{item.capacity}%</span>
      </div>
    </div>
    <div>
      <dt className="text-sm font-medium text-foreground">{item.name}</dt>
      <dd className="text-sm text-muted-foreground">{item.current} of {item.allowed} used</dd>
    </div>
  </CardContent>
</Card>
```

The `absolute inset-0 flex items-center justify-center` trick overlays the text perfectly centered in the chart area without measuring anything.

**Omoikiri use:** Session health panel (messages sent / limit, contacts reached / quota). Research Dashboard: API call quota cards.

---

## Pattern 6: Field component system (semantic form primitives)

**File:** `components/ui/field.tsx`

Blocks ships a custom `Field` component family on top of shadcn Label — this is a significant UX upgrade over raw Label + Input pairings:

```tsx
// Three orientation modes via CVA
const fieldVariants = cva(
  "group/field flex w-full gap-3 data-[invalid=true]:text-destructive",
  {
    variants: {
      orientation: {
        vertical: ["flex-col [&>*]:w-full"],
        horizontal: ["flex-row items-center", "[&>[data-slot=field-label]]:flex-auto"],
        responsive: ["flex-col @md/field-group:flex-row @md/field-group:items-center"],
      },
    },
  }
)

// FieldError handles both children and errors array with dedup
function FieldError({ errors, children, ...props }) {
  const content = useMemo(() => {
    if (children) return children;
    if (!errors?.length) return null;
    const uniqueErrors = [...new Map(errors.map(e => [e?.message, e])).values()];
    if (uniqueErrors.length == 1) return uniqueErrors[0]?.message;
    return <ul>...</ul>;
  }, [children, errors]);
  
  if (!content) return null;
  return <div role="alert" data-slot="field-error" ...>{content}</div>;
}
```

Full API: `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldLegend`, `FieldSet`, `FieldContent`, `FieldTitle`, `FieldSeparator`.

The `responsive` orientation uses CSS container queries (`@md/field-group:flex-row`) — the field switches from vertical to horizontal layout when its parent `FieldGroup` is wide enough, not based on viewport. This means forms reflow correctly inside modals and sidepanels without breakpoint hacks.

**Omoikiri/Research Dashboard use:** Replace all raw `Label` + `Input` + error `<p>` patterns with `Field` + `FieldLabel` + `FieldError`. The `FieldError errors={[]}` prop integrates cleanly with react-hook-form's `fieldState.error` array.

---

## Pattern 7: Inline copy button with scale animation (clipboard UX)

**File:** `content/components/dialogs/dialog-09.tsx`

The copy button shows an icon swap (CopyIcon → CheckIcon) using CSS scale transforms instead of conditional rendering — both icons exist simultaneously, the inactive one is scaled to 0:

```tsx
const [copied, setCopied] = useState<boolean>(false);

const handleCopy = () => {
  navigator.clipboard.writeText(inputRef.current.value);
  setCopied(true);
  setTimeout(() => setCopied(false), 1500);
};

// Inside absolute-positioned button:
<div className={cn(
  "transition-[transform,opacity] duration-200 ease-out",
  copied ? "scale-100 opacity-100" : "scale-0 opacity-0"
)}>
  <CheckIcon className="text-primary" size={16} />
</div>
<div className={cn(
  "absolute transition-[transform,opacity] duration-200 ease-out",
  copied ? "scale-0 opacity-0" : "scale-100 opacity-100"
)}>
  <CopyIcon size={16} />
</div>
```

The input field itself uses `pe-9` (padding-end) to leave room for the absolute button without the text running under it.

**Omoikiri use:** Any "copy invite link", "copy phone number", "copy playbook prompt" button. This is superior to the conditional rendering pattern because it has smooth transitions in both directions. Replaces the old `showToken` eye-toggle approach for copy feedback.

---

## Pattern 8: Semantic badge variants for status (no custom CSS)

**File:** `content/components/tables/table-03.tsx`

Status badges built purely from Tailwind opacity utilities — no custom CSS, full dark mode support:

```tsx
function getStatusBadge(status: Status) {
  switch (status) {
    case 'active':
      return (
        <Badge variant="outline" className="border-0 bg-green-500/15 text-green-700 hover:bg-green-500/25 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20">
          Active
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="outline" className="border-0 bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20">
          Pending
        </Badge>
      );
    case 'discontinued':
      return (
        <Badge variant="outline" className="border-0 bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20">
          Discontinued
        </Badge>
      );
    case 'on-hold':
      return (
        <Badge variant="outline" className="border-0 bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20">
          On Hold
        </Badge>
      );
  }
}
```

Pattern: `bg-COLOR/15 text-COLOR-700 hover:bg-COLOR/25 dark:bg-COLOR/10 dark:text-COLOR-400`. The `/15` opacity gives a soft tint without hardcoded hex colors. `border-0` on `variant="outline"` removes the default border while keeping the badge shape.

**Omoikiri use:** Chat status badges (hot lead / qualified / cold / closed), tag badges. Research Dashboard: candidate status. This is better than the current approach of hardcoded `bg-green-100 text-green-800` because it works on any background color.

---

## Pattern 9: Onboarding pipeline with animated progress + Accordion logs

**File:** `content/components/onboarding/onboarding-07.tsx`

A "deployment pipeline" UI: progress bars animate via `setInterval` + `useRef` to avoid stale closures. The log accordion shows a timeline of completed/in-progress steps:

```tsx
// Animated progress — ref pattern avoids setInterval stale closure
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

const startAnimation = useCallback(() => {
  if (intervalRef.current) clearInterval(intervalRef.current);
  intervalRef.current = setInterval(() => {
    setSteps((prev) => {
      const next = prev.map((step) => {
        if (step.id !== 3 || step.value >= 100) return step;
        const newValue = Math.min(step.value + Math.random() * 0.8 + 0.3, 100);
        return newValue >= 100
          ? { ...step, value: 100, type: 'created', createdOn: '2024-03-10 10:47' }
          : { ...step, value: newValue };
      });
      if (next[2].value >= 100 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return next;
    });
  }, 50);
}, []);

// Timeline connector — CSS line between dots
<li className="relative flex gap-x-3">
  <div className={cn(
    "absolute top-0 left-0 flex w-6 justify-center",
    stepIdx === steps.length - 1 ? "h-6" : "-bottom-6"  // last item has no connector
  )}>
    <span className="w-px bg-border" />  {/* the connecting line */}
  </div>
  <div className="size-3 rounded-full border border-border bg-muted/50 ring-4 ring-background" />
  {/* ring-background creates the "gap" between dot and line */}
```

The `ring-4 ring-background` on the dot creates the appearance of a gap between the dot and the vertical line — no extra wrapper element needed.

**Omoikiri use:** WhatsApp session startup sequence (connecting → authenticated → ready). Research Dashboard: "Analyzing candidates" progress indicator when the analysis job runs.

---

## Pattern 10: ButtonGroup primitive (connected inputs)

**File:** `components/ui/button-group.tsx`

Removes inner borders and border-radius between adjacent form elements using CVA + CSS sibling selectors:

```tsx
const buttonGroupVariants = cva(
  "flex w-fit items-stretch [&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
  // ...vertical variant also available
)

// Usage example — search input + button joined:
<ButtonGroup>
  <Input placeholder="Search..." />
  <Button>Search</Button>
</ButtonGroup>

// With text prefix:
<ButtonGroup>
  <ButtonGroupText>https://</ButtonGroupText>
  <Input placeholder="yoursite.com" />
</ButtonGroup>
```

The `ButtonGroupSeparator` uses a `Separator` component styled as a visual divider between group members.

**Omoikiri use:** Phone number field with country code prefix. Search bar with filter button. Research Dashboard: date range inputs.

---

## Pattern 11: Item compound component (list rows)

**File:** `components/ui/item.tsx`

A full compound component system for list items — `Item`, `ItemMedia`, `ItemContent`, `ItemTitle`, `ItemDescription`, `ItemActions`, `ItemHeader`, `ItemFooter`:

```tsx
// ItemMedia has icon, image, and default variants
const itemMediaVariants = cva(
  "flex shrink-0 items-center justify-center",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "size-8 rounded-sm border bg-muted [&_svg:not([class*='size-'])]:size-4",
        image: "size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover",
      },
    },
  }
)

// Usage — a contact list row:
<Item variant="outline">
  <ItemMedia variant="image">
    <img src={contact.avatar} alt={contact.name} />
  </ItemMedia>
  <ItemContent>
    <ItemTitle>{contact.name}</ItemTitle>
    <ItemDescription>{contact.phone}</ItemDescription>
  </ItemContent>
  <ItemActions>
    <Button variant="ghost" size="icon"><MessageCircle /></Button>
  </ItemActions>
</Item>
```

Uses `Slot.Root` from radix-ui for the `asChild` pattern — allows wrapping the item in a link without DOM nesting violations.

The `group-has-[[data-slot=item-description]]/item:translate-y-0.5` on ItemMedia auto-aligns the icon with the title when a description is present — purely CSS, no JS.

**Omoikiri use:** Contact list, conversation list, tag list. This is the correct abstraction for any row-with-icon-and-text-and-actions pattern. Much cleaner than ad-hoc `flex items-center` divs.

---

## Pattern 12: Empty state compound component

**File:** `components/ui/empty.tsx`

A clean compound component for empty states: `Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`:

```tsx
<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <SearchX />
    </EmptyMedia>
    <EmptyTitle>No results found</EmptyTitle>
    <EmptyDescription>
      Try adjusting your search or <a href="#">clear filters</a>.
    </EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button>Create new contact</Button>
  </EmptyContent>
</Empty>
```

`Empty` itself: `flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 md:p-12`. The dashed border makes it immediately recognizable as an empty state without extra styling.

The `[&>a]:underline [&>a]:underline-offset-4` on `EmptyDescription` auto-styles any links inside the description — no need to add `underline` class manually.

**Omoikiri/Research Dashboard use:** Empty chats list, empty contacts page, empty reports section. Single import, correct semantics, accessible.

---

## Accessibility patterns observed

1. **`aria-hidden={true}` on all decorative icons** — consistent throughout, every Lucide/Tabler icon gets this
2. **`sr-only` label pattern** — `Dialog09` uses `<Label htmlFor="share-link" className="sr-only">Share Link</Label>` for read-only inputs that have visible context but no visible label
3. **`role="alert"` on FieldError** — announces validation errors to screen readers without needing focus
4. **`role="group"` on Field and ButtonGroup** — groups related form controls semantically
5. **`aria-label` on icon-only buttons** — `aria-label="Send message"`, `aria-label="Record audio message"` on every icon button in AI components
6. **`focus-visible:ring`** — all interactive elements use `focus-visible:ring-[3px] focus-visible:ring-ring/50`, never `focus:ring` (avoids showing ring on mouse click)
7. **`data-[disabled=true]` driven opacity** — `group-data-[disabled=true]/field:opacity-50` on FieldLabel instead of `opacity-50 cursor-not-allowed` — driven by data attribute so the state is observable from outside the component

---

## Tailwind v4 patterns

The project uses Tailwind CSS v4 (no `tailwind.config.js`):

```css
/* globals.css */
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-sidebar: var(--sidebar);
  /* etc */
}

:root {
  --background: oklch(1 0 0);   /* uses oklch, not hsl */
  --primary: oklch(0.205 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
}
```

**oklch color space** — all design tokens use oklch instead of hsl. Benefits: perceptually uniform (same lightness value looks equally bright across hues), better dark mode contrast, no "blue looks brighter than red at same L" issues.

**`@theme inline`** — maps CSS custom properties to Tailwind color tokens without Tailwind needing to know the values at build time. Runtime-swappable.

**`shadow-2xs`** — a new Tailwind v4 shadow step smaller than `shadow-xs`. Used everywhere on cards: `className="shadow-2xs"`. Much subtler than `shadow-sm`.

---

## Components to copy for Omoikiri

| Component | File | Copy for |
|---|---|---|
| Stats grid (gap-px border) | stats-01.tsx | Funnel KPI row |
| Stats with sparkline | stats-10.tsx | Lead activity trends |
| Stats with radial progress | stats-07.tsx | Session/quota health |
| Stats with status icons | stats-06.tsx | Regional breakdown |
| Dialog two-pane | dialog-11.tsx | Complex create flows |
| Dialog with privacy toggle | dialog-06.tsx | Create workspace/session |
| Dialog share link + copy | dialog-09.tsx | Invite team member |
| Sidebar with collapsible sections | sidebar-01/ | Main Omoikiri sidebar |
| Sidebar inset with notifications | sidebar-02/ | Alt sidebar with alerts |
| Login with role selection | login-09.tsx | Manager onboarding |
| Login email + Google | login-02.tsx | Simple auth page |
| Field component system | components/ui/field.tsx | All forms |
| Item compound component | components/ui/item.tsx | Contact/chat lists |
| Empty state | components/ui/empty.tsx | All empty states |
| ButtonGroup | components/ui/button-group.tsx | Search bars, prefixed inputs |
| Status badges | table-03.tsx | Chat/lead status |
| Copy button animation | dialog-09.tsx | Any copyable value |

## Components to copy for Research Dashboard

| Component | File | Copy for |
|---|---|---|
| Onboarding pipeline | onboarding-07.tsx | Analysis job progress |
| Onboarding steps + progress | onboarding-03.tsx | Study wizard |
| Command menu with keyboard | command-menu-02.tsx | Global search (Cmd+K) |
| Stats usage dashboard | stats-12.tsx | API quota tracking |
| Table with filters | table-03.tsx | Candidates table |
| AI chat with voice | ai-01.tsx | Future research assistant |
| Notifications popover | sidebar-02/nav-notifications.tsx | Alert bell in header |

---

## Icon library note

This project uses **both** Lucide and `@tabler/icons-react`. Tabler has more icons, especially:
- `IconSparkles`, `IconWaveSine`, `IconMicrophone` — AI UI
- `IconCircleCheckFilled` — step completion (filled variant, Lucide only has `CheckCircle` outline)
- `IconLoader2` (with `animate-spin`) — loading state that looks better than Lucide's `Loader2`

For Omoikiri/Research Dashboard: add `@tabler/icons-react` alongside Lucide when you need the `Filled` icon variants or more specialized icons.

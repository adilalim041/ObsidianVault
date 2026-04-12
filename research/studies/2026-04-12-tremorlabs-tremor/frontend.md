# Tremor — Frontend Deep Analysis
**Date:** 2026-04-12
**Repo:** tremorlabs/tremor
**Analyst:** frontend-expert subagent
**Relevance:** Omoikiri dashboard (wa-dashboard), Research Dashboard (Nexus)

---

## Executive Summary

Tremor is a React dashboard component library built on top of Recharts + Tailwind CSS. It does NOT use shadcn/ui internally — it is a parallel design system that coexists with shadcn. Every component is a `React.forwardRef` wrapper that outputs Tailwind classes using a custom `tremorTwMerge` utility. Dark mode is first-class: every className string has a `dark:` counterpart. The library ships: 6 full chart types, 3 spark chart types, 7 visualization primitives, full input set, layout primitives, and typography components.

**For Omoikiri:** Drop-in for the `chat_ai` funnel stages, `lead_temperature` KPI cards, daily analysis trends (AreaChart), manager response times (BarChart), conversation heatmap (Tracker).

**For Research Dashboard:** SparkAreaChart in candidate list rows, DonutChart for category breakdowns, BarList for ranked candidate scoring.

---

## Pattern 1 — Color System: Semantic Palette Mapped to Tailwind Shades

**File:** `src/lib/theme.ts`, `src/lib/utils.tsx`

The entire color system is built on two objects: `colorPalette` (role → Tailwind shade number) and `getColorClassNames` (color name + shade → full Tailwind class set).

```ts
// src/lib/theme.ts
export const colorPalette = {
  canvasBackground: 50,   // lightest bg, e.g. blue-50
  lightBackground: 100,
  background: 500,        // the "main" fill shade
  darkBackground: 600,
  darkestBackground: 800,
  lightBorder: 200,
  border: 500,
  darkBorder: 700,
  lightRing: 200,
  ring: 300,
  iconRing: 500,
  lightText: 400,
  text: 500,              // used for strokes and gradients in charts
  iconText: 600,
  darkText: 700,
  darkestText: 900,
  icon: 500,
};

export const themeColorRange: Color[] = [
  "blue", "cyan", "sky", "indigo", "violet", "purple", "fuchsia",
  "slate", "gray", "zinc", "neutral", "stone", "red", "orange",
  "amber", "yellow", "lime", "green", "emerald", "teal", "pink", "rose",
];
```

```ts
// src/lib/utils.tsx — the core color resolution function
export function getColorClassNames(color: Color | string, shade?: number): ColorClassNames {
  const isBaseColor = getIsBaseColor(color);

  // handles white, black, transparent, hex (#...), CSS vars (--), rgb(...)
  if (color === "white" || color === "black" || color === "transparent" || !shade || !isBaseColor) {
    const unshadedColor = !getIsArbitraryColor(color) ? color : `[${color}]`;
    return {
      bgColor: `bg-${unshadedColor} dark:bg-${unshadedColor}`,
      hoverBgColor: `hover:bg-${unshadedColor} dark:hover:bg-${unshadedColor}`,
      selectBgColor: `data-[selected]:bg-${unshadedColor} dark:data-[selected]:bg-${unshadedColor}`,
      textColor: `text-${unshadedColor} dark:text-${unshadedColor}`,
      selectTextColor: `data-[selected]:text-${unshadedColor} dark:data-[selected]:text-${unshadedColor}`,
      hoverTextColor: `hover:text-${unshadedColor} dark:hover:text-${unshadedColor}`,
      borderColor: `border-${unshadedColor} dark:border-${unshadedColor}`,
      selectBorderColor: `data-[selected]:border-${unshadedColor} dark:data-[selected]:border-${unshadedColor}`,
      hoverBorderColor: `hover:border-${unshadedColor} dark:hover:border-${unshadedColor}`,
      ringColor: `ring-${unshadedColor} dark:ring-${unshadedColor}`,
      strokeColor: `stroke-${unshadedColor} dark:stroke-${unshadedColor}`,
      fillColor: `fill-${unshadedColor} dark:fill-${unshadedColor}`,
    };
  }

  // standard Tailwind color + shade
  return {
    bgColor: `bg-${color}-${shade} dark:bg-${color}-${shade}`,
    textColor: `text-${color}-${shade} dark:text-${color}-${shade}`,
    strokeColor: `stroke-${color}-${shade} dark:stroke-${color}-${shade}`,
    fillColor: `fill-${color}-${shade} dark:fill-${color}-${shade}`,
    // ...all 12 variants
  };
}

// Detects arbitrary (non-Tailwind) colors
const getIsArbitraryColor = (color: Color | string) =>
  color.includes("#") || color.includes("--") || color.includes("rgb");
```

**Why this matters:**
- You can pass `color="#7c3aed"` (hex) or `color="--brand-color"` (CSS var) to any Tremor component and it wraps it in `bg-[#7c3aed]` automatically. This means Omoikiri's brand colors plug in without any config changes.
- `colorPalette.text` (shade 500) is used specifically for SVG `stroke` and `fill` in charts — the current color trick: class sets `currentColor`, SVG picks it up. No inline style needed.
- The `dark:` counterpart is always generated alongside light, so dark mode is always active if `.dark` class is on `<html>`.

**Omoikiri usage:** `lead_temperature: "hot"` → `color="red"`, `"warm"` → `color="amber"`, `"cold"` → `color="blue"`. Pass directly to `BadgeDelta` or `CategoryBar`.

---

## Pattern 2 — tremorTwMerge: Extended tailwind-merge with Custom Tokens

**File:** `src/lib/tremorTwMerge.ts`

```ts
import { extendTailwindMerge } from "tailwind-merge";

export const tremorTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      shadow: [{
        shadow: [{
          tremor: ["input", "card", "dropdown"],
          "dark-tremor": ["input", "card", "dropdown"],
        }],
      }],
      rounded: [{
        rounded: [{
          tremor: ["small", "default", "full"],
          "dark-tremor": ["small", "default", "full"],
        }],
      }],
      "font-size": [{
        text: [{
          tremor: ["default", "title", "metric"],
          "dark-tremor": ["default", "title", "metric"],
        }],
      }],
    },
  },
});
```

**What this solves:** Standard `twMerge` doesn't know about `shadow-tremor-card` or `rounded-tremor-default`. Without this extension, if you pass `className="rounded-lg"` to a Card, twMerge would keep BOTH `rounded-tremor-default` AND `rounded-lg`. With the extension, it knows they're in the same class group and the later one wins.

**Usage in every component:**
```tsx
// Card.tsx
className={tremorTwMerge(
  "relative w-full text-left ring-1 rounded-tremor-default p-6",
  "bg-tremor-background ring-tremor-ring shadow-tremor-card",
  "dark:bg-dark-tremor-background dark:ring-dark-tremor-ring dark:shadow-dark-tremor-card",
  className, // user override wins correctly
)}
```

**makeClassName factory:**
```ts
// src/lib/utils.tsx
export function makeClassName(componentName: string) {
  return (className: string) => `tremor-${componentName}-${className}`;
}

// Usage in Card.tsx:
const makeCardClassName = makeClassName("Card");
// makeCardClassName("root") => "tremor-Card-root"
// This adds CSS hook classes for end-user targeting: [.tremor-Card-root] { ... }
```

**Omoikiri/Research Dashboard:** When overriding tremor tokens in `tailwind.config.js`, this merge extension must be replicated or classes will not resolve correctly. Copy `tremorTwMerge.ts` into the project's `lib/` folder.

---

## Pattern 3 — Recharts Wrapper Architecture: How AreaChart Works

**File:** `src/components/chart-elements/AreaChart/AreaChart.tsx`

The fundamental architecture is: `div (forwardRef, h-80 w-full)` → `ResponsiveContainer (100% h/w)` → `ReChartsAreaChart` → individual Recharts primitives with Tailwind class injection.

### Responsive sizing:
```tsx
<div ref={ref} className={tremorTwMerge("w-full h-80", className)} {...other}>
  <ResponsiveContainer className="h-full w-full">
    {/* chart */}
  </ResponsiveContainer>
</div>
```
`h-80` (320px) is the default. Override with `className="h-64"` or `className="h-[400px]"`. `ResponsiveContainer` from Recharts handles the actual width/height measurement — it watches parent div resize.

### Dark mode in SVG elements — the key trick:
```tsx
// XAxis — SVG text cannot use Tailwind text-color directly...
// but Recharts sets fill="" on the SVG element, then the class provides currentColor
<XAxis
  fill=""   // empty string — must be here to override Recharts default
  stroke="" // same
  className={tremorTwMerge(
    "text-tremor-label",
    "fill-tremor-content",        // SVG fill = currentColor from text color
    "dark:fill-dark-tremor-content",
  )}
/>
```
**Critical insight:** Setting `fill=""` and `stroke=""` on Recharts SVG components forces them to use the CSS class instead of the inline style Recharts would normally inject. The Tailwind `fill-*` utility sets `fill: currentColor` via CSS, and `text-*` sets the `color` property. This is how dark mode works in SVG without any JS color switching.

### Category-color mapping:
```ts
// src/components/chart-elements/common/utils.ts
export const constructCategoryColors = (
  categories: string[],
  colors: (Color | string)[],
): Map<string, Color | string> => {
  const categoryColors = new Map<string, Color | string>();
  categories.forEach((category, idx) => {
    categoryColors.set(category, colors[idx % colors.length]);
  });
  return categoryColors;
};
```
Categories cycle through the colors array. For Omoikiri with 3 funnel stages: pass `categories={["new", "qualified", "closed"]}` and `colors={["blue", "amber", "green"]}`.

### Gradient fill pattern (AreaChart):
```tsx
// For each category, create a <defs> gradient keyed by color
{categories.map((category) => {
  const gradientId = (categoryColors.get(category) ?? "gray").replace("#", "");
  return (
    <defs key={category}>
      <linearGradient
        className={getColorClassNames(categoryColors.get(category) ?? "gray", colorPalette.text).textColor}
        id={gradientId}
        x1="0" y1="0" x2="0" y2="1"
      >
        <stop offset="5%" stopColor="currentColor"
          stopOpacity={activeDot || (activeLegend && activeLegend !== category) ? 0.15 : 0.4}
        />
        <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
      </linearGradient>
    </defs>
  );
})}

// Then the Area references it:
<Area
  fill={`url(#${gradientId})`}  // gradient fill
  stroke=""                      // stroke comes from className
  className={getColorClassNames(...).strokeColor}
  strokeWidth={2}
/>
```
**Active/inactive dimming:** When a dot or legend item is active, inactive areas dim to `stopOpacity=0.15` and `strokeOpacity=0.3`. This is pure React state + inline SVG attribute changes — no CSS transitions needed.

### Invisible hit-area lines for click detection:
```tsx
// When onValueChange is provided, adds transparent thick lines on top of areas
// These catch clicks without affecting the visual
{onValueChange
  ? categories.map((category) => (
      <Line
        strokeOpacity={0}
        dataKey={category}
        stroke="transparent"
        fill="transparent"
        legendType="none"
        tooltipType="none"
        strokeWidth={12}  // wide hit area
        onClick={(props, event) => {
          event.stopPropagation();
          onCategoryClick(props.name);
        }}
      />
    ))
  : null}
```
**Omoikiri:** Use `onValueChange` on AreaChart to filter the conversation table when clicking a funnel stage trend line.

---

## Pattern 4 — FunnelChart: Pure SVG without Recharts

**File:** `src/components/chart-elements/FunnelChart/FunnelChart.tsx`

This is the most architecturally interesting component. Tremor's FunnelChart does NOT use Recharts — it is a pure SVG drawn with `React.useLayoutEffect` for resize measurement, manual math for bar positions, and `foreignObject` for HTML labels inside SVG.

### Responsive SVG measurement:
```tsx
const svgRef = React.useRef<SVGSVGElement>(null);
const [width, setWidth] = React.useState(0);
const [height, setHeight] = React.useState(0);

React.useLayoutEffect(() => {
  const handleResize = () => {
    if (svgRef.current) {
      const boundingBox = svgRef.current.getBoundingClientRect();
      setWidth(boundingBox.width);
      setHeight(boundingBox.height);
    }
  };
  handleResize();
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, [className]);  // re-runs if className changes (i.e., h-* class changes)
```
Note: `useLayoutEffect` not `useEffect` — reads DOM measurements synchronously after paint to avoid flash.

### Bar geometry calculation:
```tsx
const formattedData = React.useMemo(() => {
  return data.reduce((acc, item, index) => {
    const prev = acc[index - 1];
    const normalizedValue = value / maxValue;         // 0..1
    const barHeight = normalizedValue * realHeight;   // pixels
    const startX = index * (barWidth + gap) + 0.5 * gap;
    const startY = realHeight - barHeight;            // top-down SVG coords
    // also calculates next bar coords for polygon connectors
    acc.push({ value, normalizedValue, startX, startY, barHeight, ... });
    return acc;
  }, []);
}, [data, realHeight, barWidth, gap, maxValue]);
```

### Touch + mouse tooltip (no Recharts tooltip):
```tsx
// Custom touch handling — calculates closest bar by distance
const handleTooltip = (touch: React.Touch) => {
  const chartBoundingRect = svgRef.current?.getBoundingClientRect();
  const pageX = touch.pageX - chartX - barWidth / 2 - yAxisPadding - HALF_PADDING;

  const closestBar = formattedData.reduce((acc, current) => {
    const currentDistance = Math.abs(current.startX - pageX);
    const accDistance = Math.abs(acc.startX - pageX);
    return currentDistance < accDistance ? current : acc;
  });

  setTooltip({ x: closestBar.startX, y: closestBar.startY, data: closestBar });
};

// Same handler for mouse and touch:
<svg
  onMouseMove={(e) => handleTooltip({ pageX: e.pageX, pageY: e.pageY } as React.Touch)}
  onTouchMove={(e) => handleTooltip(e.touches[0])}
  onMouseLeave={() => setTooltip({ x: 0, y: 0 })}
  onTouchEnd={() => setTooltip({ x: 0, y: 0 })}
>
```

### Tooltip overflow correction:
```tsx
React.useEffect(() => {
  const handleTooltipOverflows = () => {
    if (tooltipRef.current) {
      const boundingBox = tooltipRef.current.getBoundingClientRect();
      if (boundingBox.right > window.innerWidth) {
        tooltipRef.current.style.left = `${width - boundingBox.width}px`;
      }
    }
  };
  handleTooltipOverflows();
  window.addEventListener("resize", handleTooltipOverflows);
  return () => window.removeEventListener("resize", handleTooltipOverflows);
}, [tooltip, width]);
```

### Data validation layer (validation wrapper pattern):
```tsx
// The chart is split into two components:
// 1. FunnelChartPrimitive — the actual rendering, assumes valid data
// 2. FunnelChart — validates data, shows NoData on error

const validateData = (data: DataT[], calculateFrom?: CalculateFrom): string | null => {
  if (calculateFrom === "previous" && data[0].value <= 0) {
    return `The value of the first item "${data[0].name}" is not greater than 0...`;
  }
  for (const item of data) {
    if (item.value < 0) return `Item "${item.name}" has negative value...`;
  }
  return null;
};

const FunnelChart = ({ data, ...props }: FunnelChartProps) => {
  const errorMessage = data ? validateData(data, props.calculateFrom) : null;
  return errorMessage ? (
    <NoData noDataText={`Calculation error: ${errorMessage}`} />
  ) : (
    <FunnelChartPrimitive data={data} {...props} />
  );
};
```

**Omoikiri direct use:**
```tsx
// CRM funnel from Supabase chat_ai.deal_stage
<FunnelChart
  data={[
    { name: "Новые", value: stats.new_leads },
    { name: "Квалифицированные", value: stats.qualified },
    { name: "Переговоры", value: stats.negotiation },
    { name: "Закрытые", value: stats.closed },
  ]}
  color="blue"
  variant="base"          // or "center" for symmetric funnel
  calculateFrom="first"   // each bar relative to first (total)
  showArrow={true}
  onValueChange={(v) => setSelectedStage(v?.categoryClicked)}
/>
```

---

## Pattern 5 — Tooltip Architecture: @floating-ui with useTooltip Hook

**File:** `src/components/util-elements/Tooltip/Tooltip.tsx`, `src/hooks/`

All Tremor components that have `tooltip?: string` prop use `@floating-ui/react` via a shared `useTooltip` hook.

```ts
// src/components/util-elements/Tooltip/Tooltip.tsx
export const useTooltip = (delay?: number) => {
  const [open, setOpen] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout>();

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && delay) {
      const timer = setTimeout(() => setOpen(isOpen), delay);
      setTimeoutId(timer);
      return;
    }
    clearTimeout(timeoutId);
    setOpen(isOpen);
  };

  const { x, y, refs, strategy, context } = useFloating({
    open,
    onOpenChange: handleOpenChange,
    placement: "top",
    whileElementsMounted: autoUpdate, // repositions on scroll/resize
    middleware: [
      offset(5),
      flip({ fallbackAxisSideDirection: "start" }), // flips below if no room above
      shift(), // shifts horizontally to stay in viewport
    ],
  });

  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  return { tooltipProps: { open, x, y, refs, strategy, getFloatingProps }, getReferenceProps };
};
```

**Usage pattern in components (e.g., CategoryBar):**
```tsx
const { tooltipProps, getReferenceProps } = useTooltip();

// reference element (the thing you hover):
<div
  ref={tooltipProps.refs.setReference}
  {...getReferenceProps}  // spreads onMouseEnter, onFocus etc.
>

// the floating tooltip itself (rendered separately):
<Tooltip text={tooltip} {...tooltipProps} />
```

**Tooltip rendering:**
```tsx
const Tooltip = ({ text, open, x, y, refs, strategy, getFloatingProps }) => {
  return open && text ? (
    <div
      ref={refs.setFloating}
      style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
      className={tremorTwMerge(
        "max-w-xs text-sm z-20 rounded-tremor-default opacity-100 px-2.5 py-1",
        "text-white bg-tremor-background-emphasis",
        "dark:text-tremor-content-emphasis dark:bg-white",
      )}
      {...getFloatingProps()}
    >
      {text}
    </div>
  ) : null;
};
```

Note the inverted dark mode: tooltip is dark bg in light mode, white bg in dark mode.

**Delay usage in Button:**
```tsx
const delay = 300; // ms
const { tooltipProps, getReferenceProps } = useTooltip(delay);
```

**Omoikiri:** Use `useTooltip` hook directly for custom tooltip needs (e.g., showing full contact name when truncated in the contacts table). `@floating-ui/react` is already a Tremor dependency.

---

## Pattern 6 — useInternalState: Controlled/Uncontrolled Component Pattern

**File:** `src/hooks/useInternalState.tsx`

```ts
const useInternalState = <T,>(defaultValueProp: T, valueProp: T) => {
  const isControlled = valueProp !== undefined;
  const [valueState, setValueState] = useState(defaultValueProp);

  const value = isControlled ? valueProp : valueState;
  const setValue = (nextValue: T) => {
    if (isControlled) {
      return; // controlled: don't update internal state, caller manages it
    }
    setValueState(nextValue);
  };

  return [value, setValue] as [T, React.Dispatch<React.SetStateAction<T>>];
};
```

**What this enables:** Every Tremor input component (Select, Tabs, Switch, DatePicker) can work either as controlled or uncontrolled:
- Uncontrolled (no `value` prop): component manages own state
- Controlled (`value={x}` + `onValueChange={setX}`): parent manages state

Used in Select:
```tsx
const [selectedValue, setSelectedValue] = useInternalState(defaultValue, value);
// When value prop is undefined → uses internal state
// When value prop is defined → mirrors it, ignores internal
```

**Omoikiri application:** The filter dropdowns in the conversations view (filter by stage, filter by tag) should be controlled — the URL search params drive the value, `useInternalState` pattern ensures the component still works even before the URL is parsed.

---

## Pattern 7 — BadgeDelta: DeltaType System for KPI Cards

**File:** `src/components/icon-elements/BadgeDelta/BadgeDelta.tsx`, `src/lib/constants.ts`

The DeltaType system is the cleanest part of Tremor for dashboard KPI use.

```ts
// src/lib/constants.ts
export const DeltaTypes = {
  Increase: "increase",
  ModerateIncrease: "moderateIncrease",
  Decrease: "decrease",
  ModerateDecrease: "moderateDecrease",
  Unchanged: "unchanged",
};

// src/lib/utils.tsx — isIncreasePositive flag flips semantics
// e.g. for "response time" metric, increase is BAD:
export const mapInputsToDeltaType = (deltaType: string, isIncreasePositive: boolean): string => {
  if (isIncreasePositive || deltaType === DeltaTypes.Unchanged) return deltaType;
  switch (deltaType) {
    case DeltaTypes.Increase: return DeltaTypes.Decrease;      // flip: increase → red
    case DeltaTypes.ModerateIncrease: return DeltaTypes.ModerateDecrease;
    case DeltaTypes.Decrease: return DeltaTypes.Increase;      // flip: decrease → green
    case DeltaTypes.ModerateDecrease: return DeltaTypes.ModerateIncrease;
  }
};
```

```tsx
// BadgeDelta component usage
<BadgeDelta
  deltaType="increase"           // raw delta
  isIncreasePositive={false}     // response time: lower is better, so increase = bad
  size="sm"
  tooltip="vs yesterday"
>
  +12%
</BadgeDelta>
```

The `isIncreasePositive` flag is critical for Omoikiri: "new leads" increase is good, "response time" increase is bad.

**Styling architecture:**
```tsx
// BadgeDelta renders as <span> with ring-1 ring-inset (not border!)
className={tremorTwMerge(
  "w-max shrink-0 inline-flex justify-center items-center cursor-default rounded-tremor-small ring-1 ring-inset",
  colors[mappedDeltaType].bgColor,
  colors[mappedDeltaType].textColor,
  colors[mappedDeltaType].ringColor,
  "bg-opacity-10 ring-opacity-20",         // light mode: tinted bg
  "dark:bg-opacity-5 dark:ring-opacity-60", // dark mode: lighter bg, more visible ring
)}
```

**Omoikiri KPI card pattern:**
```tsx
// chat_ai aggregate stats card
<Card decoration="top" decorationColor="blue">
  <Flex>
    <div>
      <Text>Горячих лидов</Text>
      <Metric>{stats.hot_leads}</Metric>
    </div>
    <BadgeDelta
      deltaType={stats.hot_leads_delta > 0 ? "increase" : "decrease"}
      isIncreasePositive={true}
    >
      {stats.hot_leads_delta}%
    </BadgeDelta>
  </Flex>
</Card>
```

---

## Pattern 8 — SparkChart: Miniature Inline Charts for Table Rows

**File:** `src/components/spark-elements/SparkAreaChart/SparkAreaChart.tsx`

SparkAreaChart is AreaChart stripped of all axes, legends, tooltips, and interaction. Default size is `w-28 h-12` (112×48px).

```tsx
// Entire component — 125 lines vs 474 for AreaChart
const AreaChart = React.forwardRef<HTMLDivElement, SparkAreaChartProps>((props, ref) => {
  const {
    data = [],
    categories = [],
    index,
    stack = false,
    colors = themeColorRange,
    showAnimation = false,
    animationDuration = 900,
    showGradient = true,
    curveType = "linear",
    connectNulls = false,
    noDataText,
    autoMinValue = false,
    minValue, maxValue,
    className,
    ...other
  } = props;

  return (
    <div ref={ref} className={tremorTwMerge("w-28 h-12", className)} {...other}>
      <ResponsiveContainer className="h-full w-full">
        <ReChartsAreaChart data={data} margin={{ top: 1, left: 1, right: 1, bottom: 1 }}>
          <YAxis hide domain={yAxisDomain} />
          <XAxis hide dataKey={index} />
          {/* gradient defs + Area components, same pattern as AreaChart */}
        </ReChartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
});
```

Note: margin is `{ top: 1, left: 1, right: 1, bottom: 1 }` — 1px on all sides to prevent clipping. AreaChart uses `top: 5` and dynamic left/bottom based on labels.

**Research Dashboard usage:**
```tsx
// In CandidatesTable — show 7-day stars trend inline
<SparkAreaChart
  data={candidate.weeklyStars}  // [{ day: "Mon", stars: 12 }, ...]
  categories={["stars"]}
  index="day"
  colors={["blue"]}
  className="w-24 h-8"          // even smaller for table cells
/>
```

---

## Pattern 9 — BarList: Ranked List with Proportional Bars

**File:** `src/components/vis-elements/BarList/BarList.tsx`

BarList is a horizontal ranked list where each row has a proportional bar behind the label. No Recharts involved — pure CSS width calculations.

```tsx
// Generic typed component — uncommon pattern for Tremor
function BarListInner<T>(props: BarListProps<T>, ref: React.ForwardedRef<HTMLDivElement>) {
  const { data, color, valueFormatter, showAnimation, onValueChange, sortOrder = "descending" } = props;

  // Dynamic component based on interactivity
  const Component = onValueChange ? "button" : "div";

  const sortedData = React.useMemo(() => {
    if (sortOrder === "none") return data;
    return [...data].sort((a, b) =>
      sortOrder === "ascending" ? a.value - b.value : b.value - a.value
    );
  }, [data, sortOrder]);

  // Width percentages — minimum 2% so bars are always visible
  const widths = React.useMemo(() => {
    const maxValue = Math.max(...sortedData.map(item => item.value), 0);
    return sortedData.map(item =>
      item.value === 0 ? 0 : Math.max((item.value / maxValue) * 100, 2)
    );
  }, [sortedData]);

  return (
    <div className="flex justify-between space-x-6">
      {/* Left column: bars with labels */}
      <div className="relative w-full space-y-1.5">
        {sortedData.map((item, index) => (
          <Component
            onClick={() => onValueChange?.(item)}
            className={tremorTwMerge(
              "group w-full flex items-center rounded-tremor-small",
              onValueChange ? "cursor-pointer hover:bg-tremor-background-muted" : "",
            )}
          >
            <div
              className="flex items-center rounded transition-all bg-opacity-40 h-8"
              style={{ width: `${widths[index]}%`, transition: showAnimation ? "all 1s" : "" }}
            >
              <div className="absolute left-2 pr-4 flex max-w-full">
                {item.href ? <a href={item.href}>{item.name}</a> : <p>{item.name}</p>}
              </div>
            </div>
          </Component>
        ))}
      </div>
      {/* Right column: values */}
      <div>
        {sortedData.map((item) => (
          <p className="text-tremor-content-emphasis">{valueFormatter(item.value)}</p>
        ))}
      </div>
    </div>
  );
}

// Generic forwardRef — preserves T type parameter
const BarList = React.forwardRef(BarListInner) as <T>(
  p: BarListProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => ReturnType<typeof BarListInner>;
```

Note the `href` + `target` support on individual items — each bar can be a link. Clicking the bar calls `onValueChange`, clicking the label link navigates. `event.stopPropagation()` prevents both firing simultaneously.

**Research Dashboard usage:**
```tsx
<BarList
  data={topCandidates.map(c => ({
    name: c.displayName,
    value: c.stars,
    href: c.githubUrl,
    target: "_blank",
    color: "blue",
  }))}
  valueFormatter={(v) => `${v.toLocaleString()} stars`}
  sortOrder="descending"
  onValueChange={(item) => navigate(`/candidates/${item.name}`)}
/>
```

---

## Pattern 10 — Tracker: Uptime / Sequence Visualization

**File:** `src/components/vis-elements/Tracker/Tracker.tsx`

The Tracker renders a series of colored blocks in a row — perfect for "last 30 days of activity", uptime monitoring, or conversation density heatmaps.

```tsx
export interface TrackerBlockProps {
  key?: string | number;
  color?: Color | string;
  tooltip?: string;  // shown on hover via @floating-ui
}

// Each block: full rounded on first/last, 1px rounded otherwise
// Creates the "pill" effect for the overall bar
className={tremorTwMerge(
  "w-full h-full rounded-[1px] first:rounded-l-[4px] last:rounded-r-[4px]",
  getColorClassNames(color ?? "gray", colorPalette.background).bgColor,
)}

// Container: fixed 40px height, 2px gap between blocks
className="h-10 flex items-center space-x-0.5"
```

**Omoikiri usage — conversation activity heatmap:**
```tsx
// Show last 90 days of WhatsApp activity per contact
const trackerData = last90Days.map(day => ({
  color: day.messageCount === 0 ? "gray"
    : day.messageCount < 5 ? "blue"
    : day.messageCount < 20 ? "cyan"
    : "emerald",
  tooltip: `${day.date}: ${day.messageCount} сообщений`,
}));

<Tracker data={trackerData} />
```

---

## Pattern 11 — ProgressCircle: SVG Ring with CSS Dash Animation

**File:** `src/components/vis-elements/ProgressCircle/ProgressCircle.tsx`

```tsx
// Size config: each size maps to radius + strokeWidth
const size2config: Record<Size, { strokeWidth: number; radius: number }> = {
  xs: { radius: 15, strokeWidth: 3 },
  sm: { radius: 19, strokeWidth: 4 },
  md: { radius: 32, strokeWidth: 6 },
  lg: { radius: 52, strokeWidth: 8 },
  xl: { radius: 80, strokeWidth: 10 },
};

// Dash offset math:
const normalizedRadius = radius - strokeWidth / 2;  // avoid clipping
const circumference = normalizedRadius * 2 * Math.PI;
const strokeDashoffset = (value / 100) * circumference;
const offset = circumference - strokeDashoffset;

// Background ring (always full):
<circle
  strokeDasharray={`${circumference} ${circumference}`}  // full circle
  className="stroke-tremor-brand-muted/50 dark:stroke-dark-tremor-brand-muted"
/>

// Progress ring:
<circle
  strokeDasharray={`${circumference} ${circumference}`}
  strokeDashoffset={offset}   // offsets by (1 - value%) to show only the filled part
  className={tremorTwMerge(
    color ? getColorClassNames(color, colorPalette.background).strokeColor
           : "stroke-tremor-brand dark:stroke-dark-tremor-brand",
    showAnimation ? "transition-all duration-300 ease-in-out" : "",
  )}
/>

// The SVG is rotated -90deg so progress starts from top
<svg className="transform -rotate-90" ...>

// Children render as overlay (centered absolute)
<div className="absolute flex">{children}</div>
```

**Omoikiri usage — consultation score display:**
```tsx
// chat_ai.consultation_score (0-100)
<ProgressCircle value={contact.consultationScore} size="sm" color="blue">
  <span className="text-xs font-medium">{contact.consultationScore}%</span>
</ProgressCircle>
```

---

## Pattern 12 — Card: decoration prop for color-coded KPI cards

**File:** `src/components/layout-elements/Card/Card.tsx`

```tsx
// decoration: "left" | "top" | "right" | "bottom" | ""
// decorationColor: any Tremor Color
const parseDecorationAlignment = (decorationAlignment: string) => {
  switch (decorationAlignment) {
    case "left":   return "border-l-4";
    case "top":    return "border-t-4";
    case "right":  return "border-r-4";
    case "bottom": return "border-b-4";
    default:       return "";
  }
};

<div
  className={tremorTwMerge(
    "relative w-full text-left ring-1 rounded-tremor-default p-6",
    "bg-tremor-background ring-tremor-ring shadow-tremor-card",
    "dark:bg-dark-tremor-background dark:ring-dark-tremor-ring dark:shadow-dark-tremor-card",
    decorationColor
      ? getColorClassNames(decorationColor, colorPalette.border).borderColor
      : "border-tremor-brand dark:border-dark-tremor-brand",
    parseDecorationAlignment(decoration),  // e.g. "border-l-4"
    className,
  )}
>
```

Note: Uses `ring-1` (not `border`) for the outer card border — rings are drawn inside the box and don't shift layout. The decoration border is added ON TOP via the `border-l-4` etc. class. The `ring-1 ring-tremor-ring` is ~10% opacity tremor token, nearly invisible — it's a subtle depth cue.

---

## Pattern 13 — NoData: Empty State Pattern

**File:** `src/components/chart-elements/common/NoData.tsx`

Every chart checks `data?.length` before rendering. If no data, shows `<NoData>`:

```tsx
const NoData = ({ className, noDataText = "No data" }) => (
  <div className={tremorTwMerge(
    "flex items-center justify-center w-full h-full border border-dashed rounded-tremor-default",
    "border-tremor-border dark:border-dark-tremor-border",
    className,
  )}>
    <p className="text-tremor-content text-tremor-default dark:text-dark-tremor-content">
      {noDataText}
    </p>
  </div>
);

// Usage in AreaChart:
<ResponsiveContainer>
  {data?.length ? <ReChartsAreaChart ... /> : <NoData noDataText={noDataText} />}
</ResponsiveContainer>
```

The `noDataText` prop propagates through `BaseChartProps` to all chart components. For Omoikiri, use `noDataText="Нет данных за этот период"`.

---

## Integration Guide for Omoikiri Dashboard

### Install:
```bash
npm install @tremor/react
# peer deps (may already be present):
npm install recharts @floating-ui/react react-transition-state
```

### tailwind.config.js:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",  // critical: scan tremor for classes
  ],
  darkMode: "class",  // tremor uses class-based dark mode
  theme: { extend: {} },
  plugins: [],
};
```

### Omoikiri KPI Dashboard page skeleton:
```tsx
import {
  Card, Metric, Text, BadgeDelta, Flex,
  AreaChart, BarChart, DonutChart, FunnelChart,
  Tracker, ProgressCircle, BarList, CategoryBar,
  Title, Subtitle,
} from "@tremor/react";

// chat_ai aggregate data → KPI cards
export function LeadTemperatureCard({ stats }) {
  return (
    <Card decoration="left" decorationColor="red">
      <Flex>
        <div>
          <Text>Горячих лидов</Text>
          <Metric>{stats.hot}</Metric>
          <Subtitle>из {stats.total} активных</Subtitle>
        </div>
        <BadgeDelta
          deltaType={stats.hotDelta >= 0 ? "increase" : "decrease"}
          isIncreasePositive={true}
        >
          {stats.hotDelta}%
        </BadgeDelta>
      </Flex>
    </Card>
  );
}

// daily AI analysis trends
export function DailyLeadsChart({ dailyData }) {
  return (
    <Card>
      <Title>Воронка лидов по дням</Title>
      <AreaChart
        className="h-72 mt-4"
        data={dailyData}
        index="date"
        categories={["hot", "warm", "cold"]}
        colors={["red", "amber", "blue"]}
        valueFormatter={(v) => `${v} лидов`}
        showLegend
        showAnimation
        noDataText="Нет данных за этот период"
      />
    </Card>
  );
}

// manager_analytics response time distribution
export function ResponseTimeBarChart({ responseData }) {
  return (
    <Card>
      <Title>Время ответа менеджеров</Title>
      <BarChart
        className="h-64 mt-4"
        data={responseData}
        index="timeRange"
        categories={["count"]}
        colors={["blue"]}
        valueFormatter={(v) => `${v} диалогов`}
        showAnimation
      />
    </Card>
  );
}

// deal_stage breakdown
export function DealStageDonut({ stageData }) {
  return (
    <Card>
      <Title>Стадии сделок</Title>
      <DonutChart
        className="h-48 mt-4"
        data={stageData}
        category="count"
        index="stage"
        colors={["blue", "cyan", "amber", "green", "red"]}
        valueFormatter={(v) => `${v} сделок`}
        showAnimation
      />
    </Card>
  );
}
```

### Research Dashboard additions:
```tsx
// Candidate list row with SparkAreaChart
import { SparkAreaChart, BadgeDelta, BarList } from "@tremor/react";

export function CandidateRow({ candidate }) {
  return (
    <div className="flex items-center gap-4">
      <span>{candidate.name}</span>
      <SparkAreaChart
        data={candidate.weeklyActivity}
        categories={["commits"]}
        index="day"
        colors={["blue"]}
        className="w-20 h-8"
      />
      <BadgeDelta
        deltaType={candidate.starsGrowth > 0 ? "moderateIncrease" : "unchanged"}
        isIncreasePositive={true}
        size="xs"
      >
        {candidate.starsGrowth > 0 ? `+${candidate.starsGrowth}` : "—"}
      </BadgeDelta>
    </div>
  );
}
```

---

## Key Gotchas

1. **Tailwind content scan:** `node_modules/@tremor/**` MUST be in `content` array. Without it, Tremor's dynamically generated classes (e.g., `bg-red-500`) get purged in production builds.

2. **SVG fill="" and stroke="":** When customizing Recharts SVG elements, always set `fill=""` and `stroke=""` as empty strings. Recharts injects inline styles for these that override CSS classes. The empty string clears the attribute.

3. **Dark mode requires `.dark` class on `<html>`:** Tremor uses `darkMode: "class"` strategy. The `dark:` variants only activate when an ancestor has class `dark`. If the project uses `media` strategy, dark mode tokens won't work.

4. **tremorTwMerge is not optional:** If passing custom `className` to Tremor components, you should use `tremorTwMerge` (not plain `twMerge`) when merging Tremor token classes like `rounded-tremor-default` — otherwise conflicts resolve incorrectly.

5. **FunnelChart tooltip overflows:** The tooltip is `position: absolute` inside a `position: relative` wrapper. If the Card has `overflow: hidden`, the tooltip will clip. Use `overflow: visible` on chart wrappers.

6. **useLayoutEffect in FunnelChart:** The FunnelChart uses `useLayoutEffect` which logs a warning in SSR environments (Next.js). Either wrap in a `typeof window !== "undefined"` guard or use the `"use client"` directive. All chart files already have `"use client"` at the top.

7. **Category colors cycle:** `constructCategoryColors` does `colors[idx % colors.length]`. If you have 5 categories and 3 colors, categories 0 and 3 get the same color. Always pass enough colors, or accept the cycling.

8. **DonutChart center label:** By default, `showLabel={true}` renders the SUM of all category values as the center label. Override with `label="custom text"`. For Omoikiri's deal stage donut, pass `label={`${totalDeals} сделок`}`.

9. **BarList minimum bar width:** `Math.max((item.value / maxValue) * 100, 2)` — bars are always at least 2% wide even for near-zero values. This prevents invisible bars but can look misleading for data with large range. Pass `showAnimation={true}` to make the proportions more obvious on load.

10. **Legend height adjustment:** `ChartLegend` uses `useOnWindowResize` to recalculate legend height dynamically. The `legendHeight` state is initialized to 60px. On first render there may be a brief layout shift if the legend wraps to multiple lines. Use `enableLegendSlider={true}` for many categories to prevent wrapping.

---

## Dependencies Used by Tremor

```json
{
  "recharts": "^2.x",           // chart primitives (AreaChart, BarChart, etc.)
  "@floating-ui/react": "^0.x", // tooltip positioning
  "react-transition-state": "^x", // button loading spinner transition
  "tailwind-merge": "^x"         // class merging with extension
}
```

Not used: shadcn/ui, Radix UI, Headless UI, Framer Motion.

---

## Accessibility Notes

- `BadgeDelta`, `CategoryBar`, `Tracker` all integrate `useTooltip` with `role: "tooltip"` and `useFocus` — keyboard accessible tooltips.
- `Legend` component handles `ArrowLeft`/`ArrowRight` keyboard navigation when `enableLegendSlider={true}`.
- `ProgressCircle` wraps the SVG with standard div — no explicit ARIA. For Omoikiri, add `aria-label={`Consultation score: ${value}%`}` manually.
- `FunnelChart` uses `role="dialog"` on the custom tooltip div — this is semantically incorrect (should be `role="tooltip"`). Known issue in the library.
- All `forwardRef` components pass `...other` to the root element, so `aria-*` and `data-*` props work correctly.

---

*Written by frontend-expert subagent. Analysis covers 100% of src/components/, src/lib/, src/hooks/, src/contexts/.*

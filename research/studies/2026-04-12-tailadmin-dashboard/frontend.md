# TailAdmin — Deep Frontend Analysis

**Date:** 2026-04-12
**Repo:** `C:/Users/User/Desktop/_study_tmp/tailadmin/`
**Version:** 2.1.0
**Stack:** React 19 + Tailwind CSS v4 + Vite 6 + TypeScript + react-router v7

---

## Summary

TailAdmin is a production-ready admin dashboard template on exactly the same stack as Omoikiri's `wa-dashboard`. It uses **Tailwind CSS v4** (new `@theme` syntax, `@custom-variant`, `@utility`), **React 19**, and **react-router v7** — all cutting-edge. The component architecture is clean, framework-free (no shadcn, no Radix), and extremely portable. Every component can be copy-pasted with minimal adaptation.

---

## Stack Details

| Concern | Solution |
|---|---|
| Framework | React 19 + Vite 6 |
| Routing | react-router v7 (not react-router-dom) |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`) |
| Charts | react-apexcharts + apexcharts |
| Calendar | @fullcalendar/react v6 |
| Date picker | flatpickr |
| Map | @react-jvectormap/core |
| Drag-and-drop | react-dnd |
| File upload | react-dropzone |
| Carousel | swiper |
| Class merging | tailwind-merge + clsx |
| SEO | react-helmet-async |
| Font | Outfit (Google Fonts, loaded via `@import` in CSS) |

---

## Pattern 1 — Collapsible Sidebar with Hover Expand

**Files:** `src/layout/AppSidebar.tsx`, `src/context/SidebarContext.tsx`, `src/layout/AppLayout.tsx`

The sidebar has three visual states: **expanded** (290px), **collapsed** (90px, icons only), **mobile** (overlay, translate-x). On desktop, hovering the collapsed sidebar temporarily expands it — a classic "mini + hover" pattern.

### SidebarContext

```tsx
// Three independent booleans drive the sidebar state
const [isExpanded, setIsExpanded] = useState(true); // user toggled
const [isMobileOpen, setIsMobileOpen] = useState(false); // mobile overlay
const [isHovered, setIsHovered] = useState(false); // hover expand

// isMobile detection via resize listener
useEffect(() => {
  const handleResize = () => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    if (!mobile) setIsMobileOpen(false);
  };
  handleResize();
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);

// Key: on mobile, isExpanded is forced false in provider value
value={{
  isExpanded: isMobile ? false : isExpanded,
  ...
}}
```

### Layout margin shift

```tsx
// AppLayout.tsx — content shifts left/right via margin transition
<div
  className={`flex-1 transition-all duration-300 ease-in-out ${
    isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
  } ${isMobileOpen ? "ml-0" : ""}`}
>
```

### Sidebar element

```tsx
// AppSidebar.tsx — sidebar itself transitions width
<aside
  className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white
    dark:bg-gray-900 h-screen transition-all duration-300 ease-in-out z-50
    border-r border-gray-200
    ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
    ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
    lg:translate-x-0`}
  onMouseEnter={() => !isExpanded && setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
```

### Submenu with CSS height animation

```tsx
// Animated accordion — measures real scrollHeight, sets it inline
const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});

// On open, read scrollHeight and store it
useEffect(() => {
  if (openSubmenu !== null) {
    const key = `${openSubmenu.type}-${openSubmenu.index}`;
    if (subMenuRefs.current[key]) {
      setSubMenuHeight((prev) => ({
        ...prev,
        [key]: subMenuRefs.current[key]?.scrollHeight || 0,
      }));
    }
  }
}, [openSubmenu]);

// Apply inline style — 0px when closed, scrollHeight when open
<div
  style={{
    height: openSubmenu?.index === index
      ? `${subMenuHeight[`${menuType}-${index}`]}px`
      : "0px",
  }}
  className="overflow-hidden transition-all duration-300"
>
```

**Active route auto-opens parent menu:**
```tsx
useEffect(() => {
  ["main", "others"].forEach((menuType) => {
    const items = menuType === "main" ? navItems : othersItems;
    items.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (location.pathname === subItem.path) {
            setOpenSubmenu({ type: menuType as "main" | "others", index });
          }
        });
      }
    });
  });
}, [location]);
```

**Omoikiri use:** Copy AppSidebar/SidebarContext directly. Replace navItems with Omoikiri's routes (Conversations, CRM, Funnel, Reports, AI Chat, Settings). The hover-expand UX is very polished and requires zero third-party dependencies.

---

## Pattern 2 — Tailwind CSS v4 Design Token System

**File:** `src/index.css`

TailAdmin uses the **new Tailwind v4 `@theme` block** to define all design tokens as CSS custom properties. This replaces `tailwind.config.js` entirely.

```css
@import "tailwindcss";

/* Custom dark mode variant — uses .dark class strategy */
@custom-variant dark (&:is(.dark *));

@theme {
  /* Typography scale */
  --text-title-2xl: 72px;
  --text-title-xl: 60px;
  --text-title-lg: 48px;
  --text-title-md: 36px;
  --text-title-sm: 30px;
  --text-theme-xl: 20px;
  --text-theme-sm: 14px;
  --text-theme-xs: 12px;

  /* Brand color scale (25 to 950) */
  --color-brand-25: #f2f7ff;
  --color-brand-500: #465fff; /* primary action */
  --color-brand-600: #3641f5;

  /* Semantic status colors */
  --color-success-500: #12b76a;
  --color-error-500: #f04438;
  --color-warning-500: #f79009;

  /* Shadow tokens */
  --shadow-theme-xs: 0px 1px 2px 0px rgba(16, 24, 40, 0.05);
  --shadow-theme-sm: 0px 1px 3px 0px rgba(16, 24, 40, 0.1), ...;
  --shadow-theme-md: 0px 4px 8px -2px rgba(16, 24, 40, 0.1), ...;
  --shadow-focus-ring: 0px 0px 0px 4px rgba(70, 95, 255, 0.12);

  /* Z-index scale */
  --z-index-9: 9;
  --z-index-99: 99;
  --z-index-9999: 9999;
  --z-index-99999: 99999;
}
```

**Custom utilities as CSS classes:**
```css
/* Sidebar navigation states — reusable @utility blocks */
@utility menu-item {
  @apply relative flex items-center w-full gap-3 px-3 py-2 font-medium rounded-lg text-theme-sm;
}

@utility menu-item-active {
  @apply bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400;
}

@utility menu-item-inactive {
  @apply text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5;
}

/* Scrollbar utilities */
@utility no-scrollbar {
  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@utility custom-scrollbar {
  &::-webkit-scrollbar { @apply size-1.5; }
  &::-webkit-scrollbar-thumb { @apply bg-gray-200 rounded-full dark:bg-gray-700; }
}
```

**Omoikiri use:** The `--color-brand-*` scale can be swapped to Omoikiri's brand color in one place. Copy the `@theme` block as-is and replace `#465fff` with the project's primary. The `menu-item`, `menu-item-active`, `no-scrollbar` utilities are directly portable.

---

## Pattern 3 — Dark Mode Theme System

**Files:** `src/context/ThemeContext.tsx`, `src/components/common/ThemeToggleButton.tsx`

Two-effect pattern: one reads from localStorage on mount, the second applies the class and persists on change. An `isInitialized` flag prevents the second effect from running prematurely.

```tsx
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>("light");
  const [isInitialized, setIsInitialized] = useState(false);

  // Effect 1: read from storage (runs once)
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    setTheme(savedTheme || "light");
    setIsInitialized(true);
  }, []);

  // Effect 2: apply and persist (only after init)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [theme, isInitialized]);

  const toggleTheme = () => setTheme((prev) => prev === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

The toggle button uses the Tailwind `dark:hidden` / `dark:block` trick to show different SVG icons for each mode — no JS state needed for the icon swap:

```tsx
<button onClick={toggleTheme} className="... dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
  <svg className="hidden dark:block"> {/* sun icon */} </svg>
  <svg className="dark:hidden"> {/* moon icon */} </svg>
</button>
```

Dark mode patterns used everywhere:
- Background: `dark:bg-gray-900` (sidebar/header) / `dark:bg-white/[0.03]` (cards — translucent white on dark)
- Text: `dark:text-white/90` (primary), `dark:text-gray-400` (secondary)
- Borders: `dark:border-gray-800`
- Interactive: `dark:hover:bg-white/5`, `dark:hover:bg-gray-800`

**Omoikiri use:** Drop-in. Omoikiri dashboard likely already has a theme toggle — if not, this is 60 lines of code including the button. The `dark:bg-white/[0.03]` pattern for cards is particularly nice: gives cards a subtle lift on dark backgrounds without hardcoding a gray value.

---

## Pattern 4 — Metric Card + Badge Component

**Files:** `src/components/ecommerce/EcommerceMetrics.tsx`, `src/components/ui/badge/Badge.tsx`

The metric card pattern: icon in a square bg-gray-100 box, label + large number below, trend badge bottom-right.

```tsx
// Metric card structure
<div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
  {/* Icon box */}
  <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
    <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
  </div>
  {/* Value row */}
  <div className="flex items-end justify-between mt-5">
    <div>
      <span className="text-sm text-gray-500 dark:text-gray-400">Customers</span>
      <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">3,782</h4>
    </div>
    <Badge color="success"><ArrowUpIcon />11.01%</Badge>
  </div>
</div>
```

Badge component — variant/color/size matrix:

```tsx
type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";
type BadgeVariant = "light" | "solid";

const variants = {
  light: {
    primary: "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
    success: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
    error:   "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
    warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400",
    info:    "bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15",
  },
  solid: {
    primary: "bg-brand-500 text-white",
    success: "bg-success-500 text-white",
    error:   "bg-error-500 text-white",
    // ...
  },
};

// Usage: renders as a <span> — composable inside any layout
<span className={`inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium ${sizeClass} ${colorStyles}`}>
  {startIcon && <span className="mr-1">{startIcon}</span>}
  {children}
</span>
```

**Omoikiri use:** Metric cards map directly to Omoikiri KPIs: total contacts, hot leads count, response time avg, AI analyzed today. Badge colors map to lead_temperature: `success` for hot, `warning` for warm, `error` for cold. The `dark:bg-brand-500/15` transparent-tinted dark mode pattern is more sophisticated than solid color.

---

## Pattern 5 — Table Component (Compound Pattern)

**Files:** `src/components/ui/table/index.tsx`, `src/components/ecommerce/RecentOrders.tsx`

The Table is a compound component — thin wrappers around native HTML table elements that accept className for Tailwind styling. No third-party table library.

```tsx
// Thin semantic wrappers
const Table: React.FC<TableProps> = ({ children, className }) => (
  <table className={`min-w-full ${className}`}>{children}</table>
);
const TableHeader: React.FC = ({ children, className }) => (
  <thead className={className}>{children}</thead>
);
const TableBody: React.FC = ({ children, className }) => (
  <tbody className={className}>{children}</tbody>
);
const TableRow: React.FC = ({ children, className }) => (
  <tr className={className}>{children}</tr>
);
// isHeader prop switches between <th> and <td>
const TableCell: React.FC<TableCellProps> = ({ children, isHeader = false, className }) => {
  const CellTag = isHeader ? "th" : "td";
  return <CellTag className={className}>{children}</CellTag>;
};
```

Usage pattern with image + text cell + Badge status:
```tsx
<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03]">
  <div className="max-w-full overflow-x-auto">
    <Table>
      <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
        <TableRow>
          <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
            Products
          </TableCell>
          {/* ... */}
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
        {tableData.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="py-3">
              {/* Image + text cell */}
              <div className="flex items-center gap-3">
                <div className="h-[50px] w-[50px] overflow-hidden rounded-md">
                  <img src={item.image} className="h-[50px] w-[50px]" alt={item.name} />
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{item.name}</p>
                  <span className="text-gray-500 text-theme-xs dark:text-gray-400">{item.variants}</span>
                </div>
              </div>
            </TableCell>
            <TableCell className="py-3 text-gray-500 text-theme-sm">
              <Badge size="sm" color={item.status === "Delivered" ? "success" : item.status === "Pending" ? "warning" : "error"}>
                {item.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
</div>
```

**Omoikiri use:** Copy Table/TableHeader/TableBody/TableRow/TableCell as-is. Use for Conversations list (contact name + avatar, last message, tag badges, AI temperature). Replaces whatever ad-hoc table HTML is in wa-dashboard now. `divide-y divide-gray-100 dark:divide-gray-800` row dividers are the correct Tailwind pattern.

---

## Pattern 6 — ApexCharts Integration Pattern

**Files:** `src/components/ecommerce/MonthlySalesChart.tsx`, `src/components/ecommerce/StatisticsChart.tsx`, `src/components/ecommerce/MonthlyTarget.tsx`

All charts use `react-apexcharts` with a wrapper div for responsive horizontal scroll.

### Bar chart (MonthlySalesChart)

```tsx
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

const options: ApexOptions = {
  colors: ["#465fff"], // brand-500
  chart: {
    fontFamily: "Outfit, sans-serif", // match dashboard font
    type: "bar",
    height: 180,
    toolbar: { show: false }, // always hide toolbar in dashboards
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: "39%",
      borderRadius: 5,
      borderRadiusApplication: "end",
    },
  },
  dataLabels: { enabled: false },
  xaxis: {
    axisBorder: { show: false }, // clean look
    axisTicks: { show: false },
  },
  tooltip: {
    x: { show: false },
    y: { formatter: (val: number) => `${val}` },
  },
};

// Horizontal scroll wrapper — critical for mobile
<div className="max-w-full overflow-x-auto custom-scrollbar">
  <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
    <Chart options={options} series={series} type="bar" height={180} />
  </div>
</div>
```

### Radial/gauge chart (MonthlyTarget)

```tsx
const options: ApexOptions = {
  chart: { type: "radialBar", sparkline: { enabled: true } },
  plotOptions: {
    radialBar: {
      startAngle: -85,
      endAngle: 85,
      hollow: { size: "80%" },
      track: { background: "#E4E7EC", strokeWidth: "100%" },
      dataLabels: {
        value: {
          fontSize: "36px",
          fontWeight: "600",
          offsetY: -40,
          color: "#1D2939",
          formatter: (val) => val + "%",
        },
      },
    },
  },
  fill: { type: "solid", colors: ["#465FFF"] },
  stroke: { lineCap: "round" },
};

<Chart options={options} series={[75.55]} type="radialBar" height={330} />
```

### Area chart with flatpickr date range

```tsx
// flatpickr date picker wired to chart date range
const datePickerRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  const fp = flatpickr(datePickerRef.current, {
    mode: "range",
    static: true,
    dateFormat: "M d",
    defaultDate: [sevenDaysAgo, today],
  });
  return () => { if (!Array.isArray(fp)) fp.destroy(); };
}, []);

// Icon-only on mobile, full input on desktop
<input
  ref={datePickerRef}
  className="h-10 w-10 lg:w-40 lg:h-auto lg:pl-10 lg:pr-3 rounded-lg border text-transparent lg:text-gray-700 cursor-pointer"
/>
```

**Omoikiri use:** Bar chart for daily message volume. Radial chart for monthly lead conversion rate. Area chart for funnel progression over time with date range filter. Use `toolbar: { show: false }` everywhere — dashboards don't need the apexcharts download/zoom buttons. Font should match dashboard: `fontFamily: "Outfit, sans-serif"`.

---

## Pattern 7 — Modal + useModal Hook

**Files:** `src/hooks/useModal.ts`, `src/components/ui/modal/index.tsx`

Three-line hook that encapsulates modal state:

```tsx
export const useModal = (initialState: boolean = false) => {
  const [isOpen, setIsOpen] = useState(initialState);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const toggleModal = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, openModal, closeModal, toggleModal };
};
```

Modal component handles: Escape key, body scroll lock, backdrop click, fullscreen mode:

```tsx
export const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, children, className,
  showCloseButton = true,
  isFullscreen = false,
}) => {
  // Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto z-99999">
      {/* Backdrop */}
      <div
        className="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"
        onClick={onClose}
      />
      {/* Content */}
      <div
        className={`relative w-full rounded-3xl bg-white dark:bg-gray-900 ${className}`}
        onClick={(e) => e.stopPropagation()} // prevent backdrop click
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-999 flex h-9.5 w-9.5 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 sm:right-6 sm:top-6 sm:h-11 sm:w-11"
          >
            {/* X SVG */}
          </button>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
};
```

Usage in UserMetaCard:
```tsx
const { isOpen, openModal, closeModal } = useModal();

<button onClick={openModal}>Edit</button>

<Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
  <div className="no-scrollbar relative w-full overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
    {/* Scrollable form inside fixed-height modal */}
    <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
      {/* form fields */}
    </div>
    <div className="flex items-center gap-3 mt-6 lg:justify-end">
      <Button size="sm" variant="outline" onClick={closeModal}>Close</Button>
      <Button size="sm" onClick={handleSave}>Save Changes</Button>
    </div>
  </div>
</Modal>
```

**Omoikiri use:** useModal is 8 lines — add immediately. Modal component is production-ready: blur backdrop, Escape key, scroll lock, fullscreen support. Use for: AI analysis details popup, contact edit form, task creation, session QR code display.

---

## Pattern 8 — Input with Validation States + Sign-in Form

**Files:** `src/components/form/input/InputField.tsx`, `src/components/auth/SignInForm.tsx`

Input component with three visual states (default, success, error) via class composition:

```tsx
const Input: FC<InputProps> = ({ disabled, success, error, hint, ...props }) => {
  let inputClasses = `h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm
    shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3
    dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30`;

  if (disabled) {
    inputClasses += ` text-gray-500 border-gray-300 opacity-40 bg-gray-100 cursor-not-allowed dark:bg-gray-800`;
  } else if (error) {
    inputClasses += ` border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:border-error-500`;
  } else if (success) {
    inputClasses += ` border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:border-success-500`;
  } else {
    inputClasses += ` bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700`;
  }

  return (
    <div className="relative">
      <input className={inputClasses} {...props} />
      {hint && (
        <p className={`mt-1.5 text-xs ${error ? "text-error-500" : success ? "text-success-500" : "text-gray-500"}`}>
          {hint}
        </p>
      )}
    </div>
  );
};
```

Password visibility toggle (from SignInForm):
```tsx
const [showPassword, setShowPassword] = useState(false);

<div className="relative">
  <Input type={showPassword ? "text" : "password"} placeholder="Enter your password" />
  <span
    onClick={() => setShowPassword(!showPassword)}
    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
  >
    {showPassword ? <EyeIcon className="fill-gray-500 size-5" /> : <EyeCloseIcon className="fill-gray-500 size-5" />}
  </span>
</div>
```

Social auth + divider pattern:
```tsx
{/* OAuth buttons */}
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
  <button className="inline-flex items-center justify-center gap-3 py-3 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10">
    {/* Google SVG */} Sign in with Google
  </button>
</div>

{/* OR divider */}
<div className="relative py-3 sm:py-5">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-gray-200 dark:border-gray-800" />
  </div>
  <div className="relative flex justify-center text-sm">
    <span className="p-2 text-gray-400 bg-white dark:bg-gray-900 sm:px-5">Or</span>
  </div>
</div>
```

**Omoikiri use:** Input with hint and error state is ready for the AI chat settings form and manager login. The OR divider pattern (absolute line + relative centered text) is a clean CSS technique worth keeping.

---

## Pattern 9 — Notification Dropdown with Ping Animation

**File:** `src/components/header/NotificationDropdown.tsx`

Unread indicator badge with CSS pulse animation:

```tsx
{/* Bell button with unread dot */}
<button className="relative ... dropdown-toggle" onClick={handleClick}>
  <span className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${!notifying ? "hidden" : "flex"}`}>
    {/* CSS ping animation */}
    <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping" />
  </span>
  {/* Bell SVG */}
</button>
```

The `animate-ping` + outer dot pattern: outer dot is the static circle, inner span with `animate-ping` creates the radar-pulse ripple effect. This is built-in Tailwind — no extra CSS needed.

Dropdown with avatar + online status indicator:
```tsx
{/* Avatar with online status dot */}
<span className="relative block w-full h-10 rounded-full max-w-10">
  <img src="/images/user/user-02.jpg" className="w-full overflow-hidden rounded-full" />
  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-[1.5px] border-white bg-success-500 dark:border-gray-900" />
</span>
```

**Omoikiri use:** The ping animation maps to hot lead alerts — when a new hot lead comes in, show the ping dot on a notification bell. Avatar + online status indicator can be used for WhatsApp contact cards (online = recently active). The `dropdown-toggle` CSS class is used as a click-outside detection exclusion (see Dropdown component's `closest(".dropdown-toggle")` check).

---

## Pattern 10 — Responsive Dashboard Grid Layout

**File:** `src/pages/Dashboard/Home.tsx`

The dashboard uses a 12-column CSS grid with explicit column spans:

```tsx
<div className="grid grid-cols-12 gap-4 md:gap-6">
  {/* Left column: 7/12 on xl, full width on smaller */}
  <div className="col-span-12 space-y-6 xl:col-span-7">
    <EcommerceMetrics />
    <MonthlySalesChart />
  </div>

  {/* Right column: 5/12 on xl */}
  <div className="col-span-12 xl:col-span-5">
    <MonthlyTarget />
  </div>

  {/* Full width */}
  <div className="col-span-12">
    <StatisticsChart />
  </div>

  {/* Bottom: 5/12 + 7/12 */}
  <div className="col-span-12 xl:col-span-5">
    <DemographicCard />
  </div>
  <div className="col-span-12 xl:col-span-7">
    <RecentOrders />
  </div>
</div>
```

Layout rules:
- All items start as `col-span-12` (full width) on mobile
- At `xl` (1280px): split into the real layout
- Inner `space-y-6` for vertical spacing within a column
- `gap-4 md:gap-6` adapts spacing for screen size

**Omoikiri use:** Map this directly to Omoikiri home dashboard:
- Left 7: Funnel overview chart + Message volume chart
- Right 5: Lead temperature radial + Today's targets
- Full width: Conversation table
- Bottom 5: CRM stage distribution | Bottom 7: Recent contacts

---

## Pattern 11 — Dropdown Component (Click-outside Detection)

**File:** `src/components/ui/dropdown/Dropdown.tsx`

```tsx
export const Dropdown: React.FC<DropdownProps> = ({ isOpen, onClose, children, className }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        // Critical: exclude the toggle button itself from closing
        !(event.target as HTMLElement).closest(".dropdown-toggle")
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`absolute z-40 right-0 mt-2 rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark ${className}`}
    >
      {children}
    </div>
  );
};
```

Key insight: the `closest(".dropdown-toggle")` exclusion prevents a double-toggle race condition. Without it, clicking the toggle button triggers both the button handler (opens) and the click-outside handler (closes) simultaneously.

**Omoikiri use:** This pattern solves the most common dropdown bug. Use for: session selector, tag picker, AI analysis action menu (the `...` three-dot menus on conversation cards).

---

## Pattern 12 — Button Component (Variant System)

**File:** `src/components/ui/button/Button.tsx`

```tsx
interface ButtonProps {
  children: ReactNode;
  size?: "sm" | "md";
  variant?: "primary" | "outline";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "px-4 py-3 text-sm",
  md: "px-5 py-3.5 text-sm",
};

const variantClasses = {
  primary: "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
  outline: "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]",
};

return (
  <button
    className={`inline-flex items-center justify-center gap-2 rounded-lg transition
      ${sizeClasses[size]} ${variantClasses[variant]}
      ${disabled ? "cursor-not-allowed opacity-50" : ""}
      ${className}`}
    onClick={onClick}
    disabled={disabled}
  >
    {startIcon && <span className="flex items-center">{startIcon}</span>}
    {children}
    {endIcon && <span className="flex items-center">{endIcon}</span>}
  </button>
);
```

The `ring-1 ring-inset` pattern for outline buttons is cleaner than `border` because it doesn't affect layout (ring is drawn inside the element, not outside).

**Omoikiri use:** Use primary for Save/Send/Confirm actions. Use outline for Cancel/Close/Secondary actions. The `className` passthrough allows ad-hoc overrides without breaking the base styles. `disabled:bg-brand-300` gives visual feedback without JS.

---

## Routing Architecture

**File:** `src/App.tsx`

Clean two-zone routing: all authenticated pages inside `<AppLayout>`, auth pages outside:

```tsx
<Routes>
  {/* All routes inside AppLayout (authenticated zone) */}
  <Route element={<AppLayout />}>
    <Route index path="/" element={<Home />} />
    <Route path="/profile" element={<UserProfiles />} />
    <Route path="/calendar" element={<Calendar />} />
    {/* ... */}
  </Route>

  {/* Auth pages — no AppLayout wrapper */}
  <Route path="/signin" element={<SignIn />} />
  <Route path="/signup" element={<SignUp />} />

  {/* 404 */}
  <Route path="*" element={<NotFound />} />
</Routes>
```

AppLayout wraps content with `<Outlet />` from react-router — standard nested route pattern. SidebarProvider wraps at layout level, not app level.

**Note:** No auth guard on routes — this is a template, not a production app. Omoikiri would need to add `<ProtectedRoute>` wrapper inside `<AppLayout>`.

---

## What to Take Directly for Omoikiri

| Component | Status | Notes |
|---|---|---|
| AppSidebar + SidebarContext | Copy directly | Replace navItems with Omoikiri routes |
| ThemeProvider + ThemeToggleButton | Copy directly | 60 lines total |
| Modal + useModal | Copy directly | Best-in-class, no deps |
| Badge | Copy directly | Covers all lead_temperature states |
| Button | Copy directly | Minimal, composable |
| Dropdown + click-outside fix | Copy directly | Solves the common race condition bug |
| Input with states + hint | Copy directly | For settings forms |
| Table compound components | Copy directly | Better than raw HTML table |
| `@theme` CSS token block | Adapt | Swap brand color, keep structure |
| `@utility` CSS classes | Copy directly | menu-item, no-scrollbar, custom-scrollbar |
| Grid layout pattern (12-col) | Apply pattern | For dashboard page composition |
| ApexCharts bar/area/radial configs | Adapt | Use brand-500 color, hide toolbar, set font |
| Ping notification dot | Copy pattern | For hot lead alerts |
| `dark:bg-white/[0.03]` card pattern | Apply everywhere | Cards on dark bg |

---

## What to Take Directly for Research Dashboard

| Component | Notes |
|---|---|
| AppSidebar (collapsed/hover mode) | Research Dashboard currently lacks this |
| Badge for candidate status | research-in-progress, studied, etc. |
| Metric cards | Stats like total candidates, analyzed today, studies done |
| Bar chart (ApexCharts) | Candidates per week / day timeline |
| Table pattern | Replace current candidate table if it uses ad-hoc HTML |
| Notification ping | When new candidate appears |
| Input validation states | Search/filter inputs |

---

## Key Tailwind v4 Notes

TailAdmin is the first repo in this study set using **Tailwind CSS v4**. Major differences from v3:

1. No `tailwind.config.js` — all config in CSS `@theme {}` block
2. `@import "tailwindcss"` instead of three `@tailwind` directives
3. Custom dark mode: `@custom-variant dark (&:is(.dark *))` instead of config option
4. Custom utilities: `@utility name { @apply ... }` instead of `@layer utilities`
5. `focus:outline-hidden` instead of `focus:outline-none`
6. `z-99999` works natively via `--z-index-99999` token (no config needed)

---

## Dependencies Worth Noting

- **flatpickr** — date range picker, used with a `useRef` + `useEffect` imperative integration pattern. Clean destroy on unmount.
- **@fullcalendar/react** — full calendar page exists but wasn't analyzed in depth. Worth separate study if Omoikiri needs a task calendar.
- **react-dnd** — drag and drop exists (likely kanban). Not analyzed — could be relevant for Omoikiri's funnel stage reordering.
- **NO shadcn/ui, NO Radix, NO Headless UI** — all components are custom Tailwind. This is a pro (no dependency lock-in) and a con (more code to maintain).

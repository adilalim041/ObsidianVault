# shadcn/ui

## What it is

A collection of beautifully designed, accessible React components that you **copy-paste into your project** instead of installing as a dependency. Built on top of Radix UI primitives + Tailwind CSS. The components become *your* code — you own them, modify them, no version drift.

## License

**MIT.** Fully usable in commercial products. No restrictions.

## Used for

- **Omoikiri.AI dashboard** — sales pipeline UI, contact list, conversation view, settings
- **News.AI dashboard** — service status, content queue, publish controls
- **Nexus.AI** — n/a (it's Telegram-based, no web UI)

## Why it's better than alternatives

Most React component libraries (Material UI, Chakra, Mantine) are NPM packages. You install, you depend, you're stuck with their styling decisions. Updates can break your UI. Customization fights the library.

shadcn/ui flips this: you run a CLI, it copies the component source code into your project, and that's it. No dependency. You own a `Button.tsx`, you can change anything. Tailwind classes are right there.

The components themselves are **the best-looking modern dashboard components available for free**. Used by tens of thousands of production apps in 2024-2026.

## How to use

```bash
# In your React + Tailwind project (e.g. wa-dashboard):
npx shadcn@latest init

# Then add components one at a time:
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add table
npx shadcn@latest add sidebar
```

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function SalesCard({ deal }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{deal.client}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>${deal.amount}</p>
        <Button variant="outline">View</Button>
      </CardContent>
    </Card>
  )
}
```

## Available component categories

Buttons, Forms (input, textarea, select, checkbox, radio, switch, slider), Layout (card, separator, tabs, accordion, collapsible), Overlays (dialog, sheet, popover, tooltip, dropdown menu, context menu, command palette), Data display (table, badge, avatar, calendar, chart), Navigation (sidebar, breadcrumb, pagination, navigation menu), Feedback (toast, alert, progress, skeleton), and many more. **Total: ~50 components**, covering most needs.

## Score: 10/10 for Adil

This is the single most important UI library to use. Ends the "Claude draws boxes" problem entirely. Should be the default for any web UI in any of Adil's projects.

## Alternatives

- **Mantine** — full design system, also great. Use if shadcn doesn't fit aesthetically.
- **HeroUI (formerly NextUI)** — opinionated, beautiful, but you depend on the package.
- **Park UI** — similar copy-paste approach but for multiple frameworks.

## Risks

- Setup requires Tailwind CSS configured first (which is the case in `wa-dashboard`)
- Components are TypeScript by default — fine for React projects
- The "owned components" approach means you don't get auto-updates — that's the point, but if a security fix appears upstream you must apply it manually

## Links

- Site: https://ui.shadcn.com
- Examples: https://ui.shadcn.com/examples (dashboards, auth pages, cards, etc.)

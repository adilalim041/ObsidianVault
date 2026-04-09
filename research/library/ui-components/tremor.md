# Tremor

## What it is

A React library focused on **dashboards and analytics UI**. Charts, KPI cards, metric grids, sparklines, gauges, donut charts, bar charts — everything you need for a sales dashboard or analytics page. Built on Tailwind, designed to look good out of the box.

## License

**Apache 2.0.** Commercial-friendly. (Note: Tremor's main library is open source. They also sell premium "Tremor Blocks" — those are paid.)

## Used for

- **Omoikiri.AI** — sales reports, funnel visualizations, manager performance metrics, conversion charts. **This is the missing piece for Adil's "I want to show real reports" need.**
- **News.AI** — service status dashboard, posts published over time, AI generation success rates, API latency

## Why it matters specifically for Adil

The `wa-dashboard` and `adilflow_dashboard` projects need **charts and KPIs that don't look amateur**. Without a chart library, Claude either draws CSS bars (looks bad) or pulls in heavy chart libs like Chart.js without styling. Tremor gives you "investor demo" quality charts in 5 lines.

## How to use

```bash
npm i @tremor/react
```

```tsx
import { Card, Metric, Text, AreaChart } from '@tremor/react'

const chartdata = [
  { date: 'Jan', Leads: 167, Won: 24 },
  { date: 'Feb', Leads: 240, Won: 31 },
  { date: 'Mar', Leads: 356, Won: 42 },
]

export function SalesOverview() {
  return (
    <Card>
      <Text>Total Leads This Month</Text>
      <Metric>356</Metric>
      <AreaChart
        data={chartdata}
        index="date"
        categories={['Leads', 'Won']}
        colors={['blue', 'emerald']}
        className="mt-4 h-72"
      />
    </Card>
  )
}
```

## Score: 9/10 for Adil

Specifically for the dashboard pages of Omoikiri and News.AI, this is essential. The free tier covers everything Adil needs for the next year.

## Alternatives

- **Recharts** — popular, MIT, lower-level. More flexible but you write more code.
- **Chart.js + react-chartjs-2** — classic, flexible, less polished out of the box.
- **Visx** (Airbnb) — primitives for custom charts.
- **Nivo** — beautiful but heavier.

## Risks

- Tremor's blocks (premium templates) are paid — but the core library is fully usable for free
- Bundle size is non-trivial — fine for dashboards, overkill for landing pages

## Links

- https://tremor.so
- Free components: https://tremor.so/docs/getting-started/installation

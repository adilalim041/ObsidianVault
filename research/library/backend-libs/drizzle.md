# Drizzle ORM

## What it is

A modern, lightweight TypeScript ORM. SQL-like syntax, fully typed, very fast. Works with Postgres (including Supabase), MySQL, SQLite.

## License

**Apache 2.0.**

## Used for

When you outgrow `supabase-js` for complex queries, or when you want stronger TypeScript types over your Supabase tables.

## Why it might matter for Adil

Right now `supabase-js` (`from('contacts').select(...)`) works fine for simple CRUD. But when queries get complex (joins, aggregations, subqueries), it gets clunky. Drizzle gives you SQL-like fluency while keeping everything typed end-to-end.

## How to use

```bash
npm i drizzle-orm pg
npm i -D drizzle-kit
```

```ts
import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/node-postgres'

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  funnelStage: text('funnel_stage').default('new'),
  createdAt: timestamp('created_at').defaultNow(),
})

const db = drizzle(pool)
const all = await db.select().from(contacts).where(eq(contacts.funnelStage, 'qualified'))
```

## Score: 7/10 for Adil

Not urgent — `supabase-js` is enough for now. Worth knowing about when query complexity grows.

## Alternatives

- **Prisma** — heavier, more features, larger community, slower
- **Kysely** — query builder, not full ORM, very type-safe

## Risks

- Schema duplication between Drizzle and Supabase (Drizzle defines tables in TS, but Supabase has its own migrations). Pick one as the source of truth.
- For RLS-heavy apps, `supabase-js` integrates better

## Links

- https://orm.drizzle.team

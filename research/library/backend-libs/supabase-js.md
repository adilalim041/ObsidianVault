# supabase-js

## What it is

The official JavaScript client for Supabase. Provides typed access to the database, auth, storage, realtime, and Edge Functions.

## License

**MIT.**

## Used for

Already used in `wa-bridge` (Omoikiri.AI) and `wa-dashboard`. Also likely in News.AI services.

## Reference patterns

This card exists for reference, not introduction — Adil already uses it. Notes for common patterns:

### Generate types from your Supabase schema

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > types/database.ts
```

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/database'

const supabase = createClient<Database>('<URL>', '<ANON_KEY>')

// Now this is fully typed
const { data, error } = await supabase.from('contacts').select('*')
```

### Realtime subscriptions

```ts
const channel = supabase.channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages'
  }, (payload) => {
    console.log('new message:', payload.new)
  })
  .subscribe()
```

### Storage upload

```ts
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`user-${userId}/avatar.png`, fileBlob)
```

## Score: 10/10 for Adil (already using)

This card serves as a reminder to use type generation and realtime where appropriate.

## Links

- https://supabase.com/docs/reference/javascript/introduction

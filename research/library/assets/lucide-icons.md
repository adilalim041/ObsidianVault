# Lucide Icons

## What it is

A clean, consistent icon set with 1500+ icons. Originally a fork of Feather Icons, now actively maintained and expanded. The default icon set used by shadcn/ui.

## License

**ISC** (essentially identical to MIT). Fully commercial-safe.

## Used for

Every UI in every Adil project that has a web frontend. Default icon library.

## How to use

```bash
npm i lucide-react
```

```tsx
import { Send, Settings, User, Trash2, Plus, Search } from 'lucide-react'

<button>
  <Send className="w-4 h-4 mr-2" />
  Send Message
</button>
```

## Why it's the default

- Pairs natively with shadcn/ui (shadcn examples use Lucide)
- Tree-shakeable — only the icons you import are bundled
- Consistent visual style across all 1500+ icons
- Active development, frequent additions

## Score: 10/10 for Adil

No reason to use anything else for a dashboard.

## Alternatives

- **Phosphor Icons** — also great, more weights
- **Heroicons** — smaller set, made by Tailwind team
- **Tabler Icons** — even larger set (4000+)
- **Iconify** — aggregator of many icon sets

## Links

- https://lucide.dev (browse and search icons)

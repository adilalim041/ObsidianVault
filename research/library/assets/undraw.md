# unDraw

## What it is

A library of free, customizable SVG illustrations. The defining feature: you can change the primary color of any illustration with one click before downloading. Hundreds of illustrations covering common UI states (empty, error, login, success, dashboard, communication).

## License

**MIT-style open license** — free for any use, commercial included, no attribution required.

## Used for

- **Omoikiri.AI** — empty states ("No conversations yet"), onboarding screens, error pages
- **News.AI** — landing page once brand exists, error states in dashboard
- **Nexus.AI** — n/a (Telegram only)

## How to use

1. Go to https://undraw.co/illustrations
2. Browse / search by keyword
3. Set the primary color (one click)
4. Download SVG
5. Drop into your project as `assets/illustrations/foo.svg` and import

```tsx
import emptyStateIllustration from '@/assets/illustrations/empty-inbox.svg'

<img src={emptyStateIllustration} alt="No messages" className="w-64 mx-auto" />
```

## Score: 9/10 for Adil

Solves the "I need a visual for this empty state but Claude draws a square" problem completely. Combined with shadcn it makes web UIs feel finished.

## Alternatives

- **Storyset.com** — animated illustrations, free with attribution
- **DrawKit** — partly free, more stylized
- **Open Doodles** — hand-drawn style, CC0

## Links

- https://undraw.co

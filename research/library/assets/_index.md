# Library: Assets

> Icons, illustrations, fonts, game assets. **Free for commercial use** unless explicitly noted.
>
> ⚠️ **Asset licenses are NOT the same as code licenses.** Always re-check the license of the specific asset you use, especially on aggregator sites.

## Icons

- [lucide-icons.md](lucide-icons.md) — **Default choice.** 1500+ MIT icons, React-ready, beautiful.
- [phosphor-icons.md](phosphor-icons.md) — Alternative with more weights and styles.
- [heroicons.md](heroicons.md) — From the Tailwind team, smaller set, very clean.
- [tabler-icons.md](tabler-icons.md) — Huge set (4000+), MIT.

## Illustrations

- [undraw.md](undraw.md) — Customizable color SVG illustrations, free, MIT-style.
- [storyset.md](storyset.md) — Animated illustrations, free with attribution.

## Fonts

- [google-fonts.md](google-fonts.md) — All free for commercial use.

## Game / image assets (for Nexus visuals or experiments)

- [kenney-assets.md](kenney-assets.md) — CC0 game assets, sprites, UI packs. Use without restriction.
- [opengameart.md](opengameart.md) — Aggregator. **Per-asset licenses vary.** Check each.

## Photos and stock

- Unsplash, Pexels — free stock photos (separate web services, no card needed)

## How to use these in Claude-built UI

When Claude is building a UI and reaches for "I'll draw a circle/square here" — point it at this library. Specifically:

- Need an icon? → use `lucide-react` (`npm i lucide-react`), import the icon by name
- Need an illustration for empty state / login / 404? → use unDraw, download SVG, drop into project
- Need a font? → use Google Fonts via Tailwind config or `<link>`
- Need game art (Nexus experiments)? → use Kenney's CC0 packs

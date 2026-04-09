# Google Fonts

## What it is

Google's collection of 1500+ open-source fonts. The default font library for the web.

## License

**SIL Open Font License (OFL)** for nearly all fonts. Free for any use, including commercial. Some fonts under Apache 2.0 — also free.

## Used for

Every web frontend in every Adil project. Default font source.

## How to use

**Option 1: Tailwind config (recommended for Vite + Tailwind projects)**
```js
// tailwind.config.js
import { defineConfig } from 'vite'

export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
      }
    }
  }
}
```

```html
<!-- in index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700&display=swap" rel="stylesheet">
```

## Recommended fonts for Adil's dashboards

- **Inter** — modern sans-serif, default for shadcn/ui, perfect for dashboards
- **Manrope** — geometric, good for headings
- **JetBrains Mono** — monospaced, for code displays
- **Geist** (Vercel's font, also on Google Fonts) — modern alternative to Inter

## Score: 10/10 for Adil

No reason to look elsewhere unless brand requires a specific paid font.

## Links

- https://fonts.google.com

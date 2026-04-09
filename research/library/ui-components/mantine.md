# Mantine

## What it is

A full React design system with 100+ components. Comes with everything: components, hooks, form library, notifications, modals, rich text editor, charts, date picker, dropzone, carousel.

## License

**MIT.**

## Used for

Backup option if shadcn/ui doesn't fit a specific case, or for building features where you want batteries-included instead of copy-paste primitives.

## Why it matters

shadcn is great but minimalist — sometimes you need a date range picker, file dropzone, rich text editor, etc. and you don't want to find separate libraries. Mantine has them all integrated.

## How to use

```bash
npm i @mantine/core @mantine/hooks
```

```tsx
import { Button, TextInput, DatePicker } from '@mantine/core'

<TextInput label="Email" placeholder="you@email.com" />
<DatePicker />
<Button>Submit</Button>
```

## Score: 7/10 for Adil

Good to know about. **Don't mix with shadcn in the same project** — pick one. For Adil, shadcn is the default; Mantine is the fallback if shadcn lacks something specific.

## Alternatives

- shadcn/ui (Adil's default)
- Chakra UI
- Material UI

## Links

- https://mantine.dev

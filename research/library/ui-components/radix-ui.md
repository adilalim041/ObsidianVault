# Radix UI

## What it is

Low-level, **unstyled** React primitives for accessible UI components. Provides the behavior (keyboard navigation, focus management, ARIA attributes, screen reader support) without any styling. You bring your own CSS.

## License

**MIT.**

## Used for

Indirect — shadcn/ui is built on Radix. You'll work with Radix when shadcn doesn't have a component you need, or when you need to customize behavior beyond what shadcn exposes.

## Why it matters

Accessibility (a11y) is hard. Building a dropdown menu that:
- Opens on click and on Enter
- Closes on Escape
- Returns focus to the trigger when closed
- Traps focus inside while open
- Announces correctly to screen readers
- Handles arrow key navigation between items

...is several hundred lines of careful code. Radix already does all of it. You add the styles.

## How to use

```bash
npm i @radix-ui/react-dropdown-menu
```

```tsx
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

<DropdownMenu.Root>
  <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content className="bg-white p-2 rounded shadow">
      <DropdownMenu.Item>Edit</DropdownMenu.Item>
      <DropdownMenu.Item>Delete</DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
```

## Score: 8/10 for Adil

You won't use it directly often (shadcn covers it), but knowing it exists means you can drop down a level when needed.

## Alternatives

- **Headless UI** — same idea from the Tailwind team, smaller component set
- **React Aria** (Adobe) — even lower level, more components, more rigorous

## Links

- https://www.radix-ui.com/primitives

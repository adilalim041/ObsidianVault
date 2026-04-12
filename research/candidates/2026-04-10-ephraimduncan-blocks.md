# Blocks

**URL:** https://github.com/ephraimduncan/blocks
**License:** MIT
**Score:** 8.1/10
**For project:** Omoikiri.AI
**Found by:** vault-research-agent, niche: frontend-ui
**Date:** 2026-04-09
**Status:** studied

## What it does

Blocks is a curated library of production-ready UI components (login forms, dashboards, dialogs, navigation bars) that you can copy-paste into your React apps with a single command. Think of it as a premium design agency's component library, but free and customizable to your brand colors.

## Why it matters for Adil

Omoikiri.AI needs polished CRM interfaces for WhatsApp agent management, conversation dashboards, and analytics views. Instead of Claude Code building these from scratch (weeks of work), Blocks provides pre-built login components for agent authentication, sidebar navigation for the dashboard, dialog modals for conversation management, and analytics charts for sales metrics. The components use the exact same tech stack Adil already has (React + Tailwind + shadcn/ui), so they integrate instantly.

## How to start using it

1. **Add a login component for WhatsApp agent auth:**
   ```bash
   npx shadcn@latest add @blocks-so/login-01
   ```

2. **Add dashboard sidebar navigation:**
   ```bash
   npx shadcn@latest add @blocks-so/sidebar-01
   ```

3. **Browse available components at blocks.so** to see live previews before adding them

4. **Components automatically appear in your `/components/ui/` folder** ready to customize with your brand colors

## What it replaces or improves

Currently when Adil needs new UI components, Claude Code has to design and build them from scratch using basic shadcn/ui primitives. This often means 2-3 iterations to get the styling and user experience right. Blocks provides battle-tested components that already handle edge cases like form validation, loading states, responsive design, and accessibility requirements that would take additional development time to implement properly.

## Risks and gotchas

The repository uses bleeding-edge React 19.1.2 which may cause hydration issues if mixed with React 18 projects. The build system prefers Bun over npm, which can create Windows compatibility friction during development. Some components depend on the blocks.so service for fetching, creating a potential single point of failure, though components work offline once installed.

## Alternatives

**Shadcn/ui Registry** - The official component library this builds upon, more stable but fewer specialized business components
**Magic UI** - Similar copy-paste component library with more animation-focused components but less dashboard-specific blocks
**Aceternity UI** - Premium component library with more advanced animations but requires paid subscription for commercial use
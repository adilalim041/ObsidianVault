# Nexus.AI — Overview

## What it is

A personal AI assistant designed to give Adil **remote control of his laptop and projects** through a Telegram bot. The original spec: remote computer access, image/video generation, and project state visibility. Right now it's an early prototype — most of the planned capability is not yet built.

## Who it's for

**Today:** only Adil. Personal use, single-user.

**Maybe-later (productizable):** there's a real market signal here. Adil saw a creator on Instagram sell a "Jarvis-style" assistant — not even AI under the hood, just a bunch of pre-coded voice commands (open browser, launch game, create file, etc.) wrapped in a Jarvis-like voice. It went viral on Instagram with the "Jarvis hears me and obeys" video format and converted into sales.

**Implication:** Nexus does NOT need to be objectively impressive to be sellable. It needs to be **demonstrable in a viral video format**. This shapes priority: visible, satisfying actions (launching things, controlling the screen, talking back) > deep AI sophistication.

## Current state (what actually works)

- Image generation (using a "weak" model — needs upgrade)
- Text replies (also using a weak model)
- Screenshot capability
- Status check for one of Adil's projects (from inside the bot)
- Telegram bot interface live

## Goals

- **Short term:** upgrade to a real AI model, fix the API reliability problems
- **Medium term:** expand the command/integration surface dramatically. Want it to be a "huge agent" in terms of what it can do.
- **Medium term:** architectural cleanup so adding new commands is fast and safe
- **Long term (if pursued):** package it as a sellable consumer product, leveraging the viral-demo format proven by competitors

## Strategic note

If Nexus is going to be productized eventually, the **product's value is the demo**, not the depth. Build features that look great on a 30-second video. This is different from Omoikiri (depth matters more than demo) and News.AI (the audience is the product, not Nexus itself).

# Cua

**URL:** https://github.com/trycua/cua
**License:** MIT
**Score:** 9.2/10
**For project:** Nexus.AI
**Usage type:** library
**Tags:** #agents #ai #infra
**Found by:** vault-research-agent, niche: saas-boilerplate
**Date:** 2026-04-10
**Status:** studied

## What it does
Cua is a platform that lets AI agents control computer interfaces across different operating systems - clicking buttons, taking screenshots, typing text, and running commands. It provides sandboxed virtual environments where your AI can safely practice and execute tasks on Linux, macOS, Windows, and Android without affecting your real system.

## Why it matters for Adil
This directly solves Nexus.AI's screen automation challenges. Instead of PyAutoGUI being limited to your host machine, Cua gives you cross-platform automation through a clean Python API. Your AI assistant can take screenshots, click specific coordinates, type text, and run shell commands across any operating system. This means Nexus.AI can help users with tasks regardless of their platform, and you can test automation flows in safe sandboxes before deploying.

## How to start using it
1. Install: `pip install cua`
2. Replace PyAutoGUI imports with: `from cua import Sandbox, Image`
3. Wrap automation in async context: `async with Sandbox.ephemeral(Image.local()) as sb:`
4. Use the unified API: `await sb.screenshot()`, `await sb.mouse.click(100, 200)`, `await sb.keyboard.type("text")`
5. Start with local sandbox, then expand to cross-platform VMs later

Minimal example:
```python
async with Sandbox.ephemeral(Image.linux()) as sb:
    screenshot = await sb.screenshot()
    await sb.mouse.click(100, 200)
    await sb.keyboard.type("Hello!")
```

## What it replaces or improves
Replaces PyAutoGUI's host-only limitations with cross-platform sandboxed automation. Instead of being stuck on whatever OS you're running, you get unified screen control across Linux, macOS, Windows, and Android. The async patterns are production-ready with proper resource cleanup, unlike PyAutoGUI's synchronous blocking calls. You also get safe testing environments instead of risking automation mistakes on your actual desktop.

## Risks and gotchas
Platform complexity - full cross-platform support requires QEMU or Apple Virtualization Framework setup, which adds infrastructure overhead. The optional cua-agent[omni] dependency includes AGPL-3.0 licensed components that create licensing complexity for closed-source products. Cloud sandbox features depend on cua.ai service availability. Start with local-only usage to minimize setup complexity.

## Alternatives
**Playwright** - Browser-only automation, simpler setup but limited to web interfaces
**Selenium** - Web automation standard, more mature but requires separate drivers for each browser
**Microsoft Power Automate** - Visual automation builder, user-friendly but Windows-only and requires subscription
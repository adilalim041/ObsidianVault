# Nanobrowser

**URL:** https://github.com/nanobrowser/nanobrowser
**License:** Unknown (claims open source)
**Score:** 6/10
**Category:** ai-tool
**For project:** General
**Found by:** vault-research-agent, niche: saas-boilerplate
**Date:** 2026-04-10

## What it does
Nanobrowser is a Chrome extension that lets you automate websites using AI agents that can click, type, and navigate web pages just like a human would. Instead of writing scripts, you chat with AI agents that figure out how to complete complex web tasks across multiple sites.

## Why it's interesting
This is genuinely impressive AI automation with a multi-agent architecture where a "Planner" agent breaks down tasks and a "Navigator" agent executes them, self-correcting when things go wrong. It runs entirely in your browser for privacy, supports 8+ LLM providers, and has excellent TypeScript code quality with sophisticated security guardrails.

## Startup potential
Fork this into a hosted SaaS platform called "WebAI Pro" - handle the API costs, add team collaboration, workflow templates, and scheduled automation. Target e-commerce sellers, recruiters, and data researchers who need to automate repetitive web tasks but don't want to manage API keys. The Chrome extension approach limits scale, but the agent patterns could power a much bigger automation platform.

## How to start using it
1. Install from Chrome Web Store: https://chromewebstore.google.com/detail/nanobrowser/imbddededgmcgfhfpcjmijokokekbkal
2. Get API keys from OpenAI, Anthropic, or other supported providers
3. Click the Nanobrowser icon, go to Settings, add your keys
4. Start chatting: "Find all product prices on this page" or "Fill out this contact form"

## Best features
• Multi-agent self-correction where Planner and Navigator agents work together
• Comprehensive security system that detects malicious websites and protects credentials
• Supports switching between 8+ LLM providers mid-conversation
• Excellent TypeScript patterns with Zod validation and event-driven architecture
• Privacy-first design - everything runs locally, no data sent to Nanobrowser servers

## Risks and gotchas
The biggest red flag is unknown licensing despite "open source" claims - you can't safely commercialize without clear legal terms. Users pay their own API costs which add up quickly. Only works on Chrome/Edge, and complex automation can be unreliable when websites change their layouts.

## Similar projects
• Playwright + OpenAI integration for custom automation scripts
• Zapier's AI Actions for no-code web automation
• Anthropic's new Computer Use API for broader screen automation
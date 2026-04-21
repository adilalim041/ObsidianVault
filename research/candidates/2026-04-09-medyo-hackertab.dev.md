# Hackertab.dev

**URL:** https://github.com/medyo/hackertab.dev
**License:** Apache-2.0
**Score:** 6.7/10
**For project:** News.AI
**Usage type:** product-idea
**Tags:** #frontend #data
**Found by:** vault-research-agent, niche: trending-tools
**Date:** 2026-04-09
**Status:** studied

## What it does
Hackertab is a browser extension that replaces your new tab page with a dashboard showing curated developer news from 12+ sources like GitHub Trending, Hacker News, DevTo, and Product Hunt. Users can filter content by programming language and topic, bookmark articles, and get AI recommendations.

## Why it matters for Adil
News.AI needs to aggregate content from multiple news sources, and this project provides proven patterns for exactly that. The React Query hook patterns and multi-source API aggregation architecture can be directly adapted for News.AI's Express services. The query caching and error handling strategies solve the same problems News.AI will face when pulling from different news APIs simultaneously.

## How to start using it
```bash
git clone https://github.com/medyo/hackertab.dev.git
cd hackertab.dev
yarn install
yarn start
```
Visit http://localhost:3000 to see the dashboard. The most valuable code is in `src/features/*/api/` for API patterns and `src/features/auth/hooks/useAuth.ts` for React Query examples. You'll need to create a `.env` file (variables not documented) and may need to switch the git clone to HTTPS if SSH keys aren't set up.

## What it replaces or improves
Instead of building News.AI's content aggregation from scratch, this provides tested patterns for handling multiple API sources with proper caching, error recovery, and user preferences. It replaces the need to figure out React Query pagination, authentication flows, and state persistence—all solved problems here.

## Risks and gotchas
The project has a version conflict between TanStack React Query v4 (production) and v5 (persistence client) that could cause runtime errors. The README doesn't document required environment variables, making setup frustrating. Uses custom CSS instead of Tailwind, so UI components won't drop into wa-dashboard easily. Firebase Auth patterns would need conversion to Supabase.

## Alternatives
- **Feedly**: Commercial news aggregator with APIs, but expensive and less customizable
- **AllTop**: Simple news aggregation service, but no modern React patterns to learn from
- **Netvibes**: Dashboard-style news reader, but proprietary with no code access
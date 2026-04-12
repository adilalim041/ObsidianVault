# Deep Study: Post4U Scheduler

**URL:** https://github.com/ShadowSlayer03/Post4U-Schedule-Social-Media-Posts
**Studied:** 2026-04-12
**Original candidate:** [[candidates/2026-04-11-shadowslayer03-post4u-schedule-social-media-posts.md]]
**Score (parser):** 7.2/10
**Deep Score:** 7.0/10
**Stack:** FastAPI, MongoDB (Beanie ODM), APScheduler, Reflex (Python frontend), Docker Compose
**Architecture:** monolith (full-stack SaaS)
**Status:** studied
**Recommendation:** watch

## Architecture Summary

Self-hosted social media scheduler for 5 platforms (Twitter, Reddit, Telegram, Discord, Bluesky). FastAPI backend with APScheduler + MongoDBJobStore for persistent scheduling. Selective retry per-platform — successful platforms never get duplicates.

Key insight: APScheduler + MongoDBJobStore pattern solves the "lost jobs on container restart" problem that any Railway/Docker-deployed scheduler faces.

## Relevance to Adil's Projects

- **News.AI:** HIGH — APScheduler + MongoDBJobStore for content scheduling, selective retry for multi-platform publishing
- **Omoikiri:** MEDIUM — Telegram media routing, secrets.compare_digest for API auth
- **Nexus:** Not applicable

## Subagent Reports
- [Backend analysis](backend.md)

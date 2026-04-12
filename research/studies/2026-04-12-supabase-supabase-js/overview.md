# Deep Study: supabase-js

**URL:** https://github.com/supabase/supabase-js
**Studied:** 2026-04-12
**Original candidate:** [[candidates/2026-04-11-supabase-supabase-js.md]]
**Score (parser):** 6.2/10
**Deep Score:** 9.0/10
**Stack:** TypeScript, fetch API, GoTrue, PostgREST, Realtime WebSocket
**Architecture:** library (facade over 5 sub-clients)
**Status:** studied
**Recommendation:** adopt

## Architecture Summary

SupabaseClient is a thin orchestrator over 5 independent clients: GoTrueClient (auth), PostgrestClient (DB queries), RealtimeClient (WebSocket), StorageClient (files), FunctionsClient (edge functions). Each is instantiated lazily. All HTTP requests go through fetchWithAuth wrapper that injects current JWT.

Key insight: we already use this SDK in Omoikiri — understanding its internals lets us fix real bugs (missing write retries, oversized .in() queries, no Supabase request logging).

## Relevance to Adil's Projects

- **Omoikiri (wa-bridge):** CRITICAL — 4 concrete improvements identified (write retries, .in() limits, request logging, graceful shutdown)
- **Research Dashboard:** Uses GitHub API not Supabase, but patterns transferable
- **Nexus:** Not applicable (Python, uses supabase-py)

## Subagent Reports
- [Backend analysis](backend.md)

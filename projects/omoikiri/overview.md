# Omoikiri.AI — Overview

## What it is

A CRM system built around WhatsApp conversations, with sales-funnel control at every stage. Originally built by Adil (a marketer by background) to give visibility into the sales side: how managers handle incoming leads, how conversations move through the funnel, what actions they take, and what the sales analytics look like.

**Pitch in one sentence (work in progress):** "A CRM that monitors every step of your sales funnel, including the actual WhatsApp conversations between managers and clients, with AI-driven lead qualification and reports."

## Who it's actually for

**Today (real users):**
- **Adil** — using it as a marketer, looking at how managers process leads
- **ROP (Head of Sales) role** — partially, same observability needs

**Reports go to:** Adil's father (the boss), who is also the owner of the underlying business.

**Tomorrow (planned):**
- Marketing side will be added — ad performance metrics, campaign tracking, etc.
- Eventually templatable for resale to other small/medium businesses

## Pain it solves

Before this existed, there was **no visibility** into:
- How managers handled the leads that came in
- The quality of customer conversations
- Sales analytics in any structured form

The core value is **observability of the sales side** — letting management actually see what's happening inside WhatsApp conversations and at each funnel stage.

## Current state

**Working:**
- Pulls all WhatsApp messages via Baileys into Supabase
- AI analyzer (runs daily via cron, calls Claude API) reads conversations and assigns funnel stages + tags (accuracy is "so-so" right now — see backlog)
- CRM view in the dashboard shows contacts, messages, tags, funnel position
- Built-in sales reports

**Not yet:**
- Marketing-side metrics (ad performance)
- High-accuracy AI lead classification
- Multi-tenant / template form for reselling

## Strategic context

This is **Adil's father's business** that Adil is working on. Direct monetization from this exact instance is uncertain — the path to revenue is **templatizing it** so other business owners can plug in their WhatsApp + sales setup.

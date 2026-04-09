# Scout — Learnings

> This file is auto-updated by the scout subagent after each run.
> New entries are appended at the bottom with dates.
> You can read and correct entries manually if the scout learned something wrong.

---

## 2026-04-09
- For agent/LLM projects targeting accuracy improvement, RAG frameworks (Langchain-Chatchat) are more relevant than general bot frameworks or voice assistants—prioritize repos that address context management and prompt iteration.

## 2026-04-09
- For Adil's Omoikiri.AI project (Node/React/Supabase/Tailwind), prioritize repos that match the exact stack (React + Tailwind + shadcn/ui) over generic UI libraries, since integration friction is lower.

## 2026-04-09
- Dashboard/charting libraries (Tremor) are relevant because Omoikiri needs to visualize funnel stages and conversation analytics — not just CRUD forms.

## 2026-04-09
- Searching for "ai-reliability" returns a mix of enterprise infrastructure (API gateways) and abandoned/demo projects; filtering for >1K stars and checking license + active maintenance significantly improves signal.

## 2026-04-09
- Both top results are LLM gateway/routing tools—worth noting that "reliability" in the LLM space heavily skews toward operational concerns (rate limits, failover, cost control) rather than prompt/model accuracy.

## 2026-04-09
- For "devops-tools" searches in a Supabase context, job queue libraries (pg-boss, graphile/worker) are more actionable than CLI tools or migration guides—filter by what integrates into runtime, not what's just a development utility.

## 2026-04-09
- For Adil's agent accuracy problems (funnel stage classification), RAG frameworks with explicit prompt + context management (Langchain-Chatchat) are more actionable than generic bot frameworks or voice assistants; prioritize repos that solve prompt iteration and retrieval workflows.

## 2026-04-09
- aiogram and voice-assistant repos are lower priority here—aiogram is Telegram-specific (not WhatsApp), and A-Hackers-AI-Voice-Assistant is 1.1K★ with limited active maintenance signal compared to HuggingFace's well-resourced speech-to-speech project.

## 2026-04-09
- For Adil's Omoikiri.AI project, filtering results to repos that explicitly match the React + Tailwind + shadcn/ui stack yields higher-confidence candidates than generic dashboard/UI libraries; integration friction is a key practical filter.

## 2026-04-09
- Material Kit React and TailGrids, while well-maintained and MIT-licensed, are design template/kit repos rather than component libraries—lower relevance than shadcn-ui or Tremor because Adil already has a working design system in place.

## 2026-04-09
- For "content-automation" queries, RSS ingestion tools (rss-parser) are more actionable than video-upload or restoration frameworks—filter for input/pipeline stages, not output-heavy tools, when the project's bottleneck is data ingestion and classification accuracy.

## 2026-04-09
- For agent accuracy problems in conversation classification, RAG frameworks with explicit prompt/context management (Langchain-Chatchat) are significantly more actionable than generic voice or bot frameworks—prioritize repos that solve retrieval and prompt iteration workflows over transport layers.

## 2026-04-09
- For Omoikiri.AI (React + Tailwind + shadcn/ui stack), dashboard/charting libraries (Tremor) and shadcn/ui-derivative repos (21st) are more actionable than generic Material UI templates—integration friction is lowest when the component library already matches the project's design system.

## 2026-04-09
- Material Kit React and TailGrids, while well-maintained and MIT-licensed, are design template/kit repos rather than targeted component libraries; they add integration overhead compared to Tremor (which pairs naturally with Tailwind) or 21st (which is shadcn/ui-native).

## 2026-04-09
- For LLM reliability/accuracy problems in production (like Adil's funnel classifier), gateway/routing repos are more actionable than general bot frameworks—they solve operational resilience (fallback, cost control) which frees up iteration bandwidth for prompt refinement.

## 2026-04-09
- Both top results are gateway/routing tools rather than pure "accuracy improvement" repos; this confirms that "ai-reliability" in Adil's context likely means *operational stability during development*, not just model selection or fine-tuning.

## 2026-04-09
- For agent accuracy problems in Omoikiri.AI's funnel classification task, RAG frameworks with explicit prompt + context management (Langchain-Chatchat) remain more actionable than transport-layer or voice-specific tools—the bottleneck is prompt iteration and retrieval quality, not voice I/O.

## 2026-04-09
- For Adil's current bottleneck (AI analyzer accuracy), gateway/routing repos remain more actionable than generic LLM research articles or reasoning frameworks—they solve the *operational friction* that blocks iteration (cost blowouts, API failures, session loss), freeing bandwidth for prompt tuning.

## 2026-04-09
- The three Zhihu articles in this batch are discussion posts, not repos; the filter is working correctly to exclude them, but confirms that "ai-reliability" queries on Chinese platforms return higher editorial/discussion-to-code ratios than English searches.

## 2026-04-09
- For Omoikiri.AI (React + Tailwind + shadcn/ui stack), filtering to repos that explicitly match the tech stack yields higher confidence than generic Material UI templates or design kits—integration friction is the practical filter, not just star count.

## 2026-04-09
- Material Kit React and TailGrids are well-maintained and MIT-licensed, but they are design template/kit repos rather than component libraries; they add friction compared to Tremor (which pairs naturally with Tailwind) or 21st (which is shadcn/ui-native) when the project already has a working design 

## 2026-04-09
- Someday and blocks are lower priority here—while shadcn/ui-based and MIT-licensed, they are domain-specific (calendar picker, generic blocks) rather than directly addressing Omoikitori.AI's immediate needs (dashboard visualization, classifier accuracy iteration).

## 2026-04-09
- For Adil's "content-automation" + classifier accuracy context, repos solving *input ingestion and context retrieval* (rss-parser, RAG frameworks) are more actionable than *output generation* (video upload, image restoration) or *distribution* (multi-platform schedulers)—the bottleneck is funnel clas

## 2026-04-09
- For WhatsApp-CRM searches, filter aggressively for repos that solve *session persistence* and *message routing* (the actual operational friction in Baileys-based bots), not just "has OpenAI integration"—bot frameworks without session management lessons are less actionable than working reference impl

## 2026-04-09
- WhatsApp bot repos with 300+ stars tend to be battle-tested on Railway/Heroku ephemeral filesystems; prioritize these over lower-star alternatives when session storage is a known gotcha in the project.

## 2026-04-09
- Job board listing pages (Indeed, LinkedIn, Glassdoor) are consistently returned in "devops-tools" queries; they clutter results and should be filtered by domain exclusion (*.indeed.com, *.linkedin.com, *.glassdoor.com) or by checking for GitHub URL presence in the first pass.

## 2026-04-09
- Between pg-boss and graphile/worker, pg-boss is more relevant here because Adil already uses Supabase (PostgreSQL) and has felt friction with the dead `ai_queue` table pattern—pg-boss solves that exact pain. graphile/worker is also solid (MIT, 2.2k★) but adds a separate daemon process, increasing de

## 2026-04-09
- Searches for "trending-tools" or broad developer discovery queries return heavy GitHub homepage/login noise and linguistics discussion pages; narrow by adding `CLI` or `extension` to the query to filter for actual tools.

## 2026-04-09
- Both candidates here are *discovery* or *ingestion* tools (browser extension, CLI scraper) rather than *output* or *distribution* tools—this aligns with the accumulated pattern that Adil's bottleneck is input/context retrieval for the classifier, not publishing downstream.

## 2026-04-09
- For Adil's classifier accuracy work, repos solving *structured output extraction* (instructor) and *provider routing* (OmniRoute) are more immediately actionable than general prompt engineering frameworks—they directly unblock the two bottlenecks: confidence calibration and multi-model iteration.

## 2026-04-09
- Coai is enterprise-grade (9k★, heavy billing/admin surface) and overkill for Omoikori.AI's current single-provider, iteration-focused workflow; OmniRoute's lighter footprint (2.1k★, MIT, OpenAI-compatible) better matches the stage and stack.

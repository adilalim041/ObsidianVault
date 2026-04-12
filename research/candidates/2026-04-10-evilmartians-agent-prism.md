# AgentPrism

**URL:** https://github.com/evilmartians/agent-prism
**License:** unknown
**Score:** 6.5/10
**For project:** News.AI
**Found by:** vault-research-agent, niche: ai-tools
**Date:** 2026-04-10
**Status:** studied

## What it does
AgentPrism transforms messy AI debugging logs into clean visual timelines. Instead of scrolling through JSON dumps when your AI agents break, you get interactive diagrams showing exactly which LLM calls failed, how long each step took, and where your workflow went wrong.

## Why it matters for Adil
News.AI's multi-service pipeline (Gemini API → Sharp image processing → database) creates debugging nightmares when something breaks. AgentPrism's adapter pattern would let you visualize the entire chain in one timeline view, instantly spotting whether failures happen in the AI calls, image processing, or data storage. The timeline visualization with percentage positioning is exactly what you need to understand service bottlenecks.

## How to start using it
```bash
npx degit evilmartians/agent-prism/packages/ui/src/components src/components/agent-prism
npm install @evilmartians/agent-prism-data @evilmartians/agent-prism-types
npm install @radix-ui/react-collapsible @radix-ui/react-tabs classnames lucide-react
```

Add to your React dashboard:
```jsx
import { TraceViewer } from './components/agent-prism/TraceViewer';
import { openTelemetrySpanAdapter } from '@evilmartians/agent-prism-data';

<TraceViewer data={[{ traceRecord: yourTraceRecord, spans: openTelemetrySpanAdapter.convertRawDocumentsToSpans(yourTraceData) }]} />
```

## What it replaces or improves
Currently you debug News.AI failures by checking separate logs across services, then manually correlating timestamps to find where things broke. This gives you a unified timeline showing the entire request flow from Gemini API call through image processing to database write, with clear visual indicators of failures and bottlenecks.

## Risks and gotchas
Major red flag: no explicit license makes this risky for commercial use. Evil Martians usually uses MIT but you need confirmation before implementation. React 19+ requirement means upgrading your entire stack. Heavy Radix UI dependencies add significant bundle size. The patterns are valuable but legally unclear.

## Alternatives
- **Langfuse** - Hosted LLM observability platform with similar trace visualization, safer licensing
- **Weights & Biases** - Comprehensive ML monitoring with trace support, enterprise-grade but heavier
- **Custom OpenTelemetry + Grafana** - Self-hosted solution using standard telemetry tools, more setup but full control
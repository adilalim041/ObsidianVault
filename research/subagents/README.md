# Research Subagents — Memory Files

This folder contains **role definitions and accumulated learnings** for each research subagent. The research agent (`vault-research-agent/`) reads these files at start of each run and writes new learnings at the end.

## How it works

- `role.md` — written by Adil/Claude, defines the subagent's job. Don't auto-overwrite.
- `learnings.md` — written BY the subagent itself after each run. Accumulates patterns and insights over time. You can read and correct these manually.

## Subagents

| Subagent | Role | Learns about |
|---|---|---|
| **scout** | Finds repos matching backlog needs | Which queries find good results |
| **readme-reader** | Reads READMEs, extracts metadata | Signs of quality/garbage repos |
| **scorer** | Evaluates fit for Adil's projects | What Adil's projects actually need |
| **writer** | Generates vault candidate cards | Card format that Adil prefers |

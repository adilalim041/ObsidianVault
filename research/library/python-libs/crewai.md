# CrewAI

## What it is

A multi-agent orchestration framework where multiple AI "agents" with distinct roles collaborate on a task. Each agent has a role, goal, and backstory; they pass work between each other.

## License

**MIT.**

## Used for

When a task requires multiple specialized agents working together. Example: a "researcher" agent that finds info, an "analyst" agent that interprets it, a "writer" agent that produces output.

## Why it could matter for Adil — but probably overkill for now

Adil specifically said earlier in our conversation that he tried multi-agent setups (orchestrator + frontend-dev + backend-dev) and they didn't work in practice — the orchestrator just did the work itself instead of delegating. CrewAI has the same risk.

That said, it's worth knowing about for News.AI: imagine a "Topic Researcher" agent + "Headline Writer" agent + "Image Prompt Engineer" agent + "Quality Checker" agent. Each specialized prompt could outperform one giant prompt.

## How to use

```bash
pip install crewai
```

```python
from crewai import Agent, Task, Crew

researcher = Agent(
    role='Topic Researcher',
    goal='Find trending topics in tech news',
    backstory='You are an expert at finding interesting tech stories.',
    tools=[search_web_tool],
)

writer = Agent(
    role='Headline Writer',
    goal='Write attention-grabbing headlines for social media',
    backstory='You write viral headlines for Instagram.',
)

task1 = Task(description='Find one trending tech story today', agent=researcher)
task2 = Task(description='Write a headline for that story', agent=writer)

crew = Crew(agents=[researcher, writer], tasks=[task1, task2])
result = crew.kickoff()
```

## Score: 6/10 for Adil

Worth experimenting with for News.AI content generation, but not urgent. **Watch out for the same delegation failure pattern Adil already hit** — make sure each agent really has distinct work.

## Alternatives

- **LangGraph** — more flexible, graph-based
- **autogen** — Microsoft's version
- **smolagents** — single agent with multiple tools is often simpler

## Links

- https://www.crewai.com
- https://github.com/crewAIInc/crewAI

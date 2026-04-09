# smolagents

## What it is

A minimalist agent framework from HuggingFace. Build AI agents that can use tools, execute code, and call other agents — in **a few hundred lines of total code**, with a simple mental model. Anti-bloat alternative to LangChain.

## License

**Apache 2.0.**

## Used for

- **Nexus.AI** — when expanding Nexus into a "huge agent with many commands and integrations" (per backlog), this is a good base framework instead of building from scratch.

## Why it might matter for Nexus

Nexus's backlog says: "expand the command surface significantly + architectural cleanup". A naive approach is "add more if/else in router.py for every new command". A better approach is an **agent loop**: the LLM decides which tool to call based on the user's request.

smolagents provides exactly this loop without the LangChain learning curve.

## How to use

```bash
pip install smolagents
```

```python
from smolagents import CodeAgent, HfApiModel, tool

@tool
def take_screenshot() -> str:
    """Takes a screenshot of Adil's desktop and returns the file path."""
    import pyautogui
    pyautogui.screenshot('screen.png')
    return 'screen.png'

@tool
def check_omoikiri_status() -> str:
    """Checks if Omoikiri.AI is running on Railway."""
    # ... check logic
    return "All services healthy"

@tool
def generate_image(prompt: str) -> str:
    """Generates an image from a text prompt and returns the file path."""
    # ... call Gemini
    return 'generated.png'

model = HfApiModel("Qwen/Qwen2.5-Coder-32B-Instruct")
agent = CodeAgent(tools=[take_screenshot, check_omoikiri_status, generate_image], model=model)

result = agent.run("Show me how my Omoikiri project is doing and take a screenshot")
# The agent figures out: call check_omoikiri_status, then take_screenshot, return both
```

## Score: 8/10 for Nexus's medium-term direction

Worth evaluating when Nexus's command count grows past ~10 and `router.py` starts getting messy.

## Alternatives

- **CrewAI** — multi-agent collaboration, more structured
- **LangGraph** — graph-based agent flows, more complex
- **autogen** — Microsoft's multi-agent framework
- **DIY** — hand-roll the routing in router.py (current approach)

## When NOT to use an agent framework

- When the command set is small and well-defined (just use if/else)
- When you can't tolerate the LLM occasionally picking the wrong tool
- When latency matters (agent loops are slower than direct dispatch)

## Links

- https://github.com/huggingface/smolagents

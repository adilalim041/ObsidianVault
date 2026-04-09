# instructor (Python)

## What it is

The Python version of instructor. Forces LLMs to return **validated, structured output** matching a Pydantic model. Same idea as instructor-js but uses Pydantic instead of Zod.

## License

**MIT.**

## Used for

- **Nexus.AI** — anywhere the bot needs structured data from an LLM (intent classification, entity extraction, command parsing)
- Particularly useful for **router intent classification**: "what does the user want me to do?" → returns `{intent: 'screenshot' | 'image_gen' | ..., args: {...}}` reliably

## Why it matters for Nexus

Nexus's `router.py` likely dispatches based on keywords or simple parsing. With instructor, you can use an LLM to parse user intent into a clean structured object, every time:

```
"hey nexus take a pic of the screen and send it to adil"
→ { intent: "screenshot", target: "adil", confidence: 0.95 }
```

This is way more flexible than keyword matching and pairs perfectly with the agent-routing direction.

## How to use

```bash
pip install instructor pydantic openai
```

```python
import instructor
from openai import OpenAI
from pydantic import BaseModel
from typing import Literal

class NexusCommand(BaseModel):
    intent: Literal['screenshot', 'image_gen', 'project_status', 'os_command', 'chat']
    confidence: float
    parameters: dict
    reasoning: str

client = instructor.from_openai(OpenAI())

result = client.chat.completions.create(
    model="gpt-4o-mini",
    response_model=NexusCommand,
    messages=[
        {"role": "system", "content": "Parse the user's command for Nexus."},
        {"role": "user", "content": "take a pic of my screen and tell me what's open"},
    ]
)

print(result.intent)        # 'screenshot'
print(result.parameters)    # {}
print(result.confidence)    # 0.97
```

## Works with any provider via LiteLLM

```python
import instructor
from litellm import completion

client = instructor.from_litellm(completion)

result = client.chat.completions.create(
    model="gemini/gemini-2.0-flash",  # or any other LiteLLM-supported model
    response_model=NexusCommand,
    messages=[...]
)
```

## Score: 10/10 for Nexus

If Nexus is doing intent routing or any structured AI extraction, this should be the default.

## Alternatives

- **outlines** — similar idea, more research-y, supports more constraint types
- **guidance** — Microsoft's structured generation lib
- **Direct OpenAI structured outputs** (response_format) — works but only with OpenAI

## Links

- https://python.useinstructor.com

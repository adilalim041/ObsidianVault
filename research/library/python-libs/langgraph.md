# LangGraph

## What it is

A library for building **stateful, graph-based AI agent workflows**. Each "node" in the graph is a function or LLM call, and you define edges (sometimes conditional) between them. State is persisted across nodes.

## License

**MIT.**

## Used for

When agent flows get complex and need branching, loops, human-in-the-loop, or persistent state. Made by the LangChain team but standalone — you don't need full LangChain.

## Why it might matter for Adil — later

For Nexus or News.AI when workflows get complex: "if the user asks X, do A; if A returns Y, do B; otherwise do C, then loop back". This is a graph problem, not a "linear chain" problem.

## How to use

```bash
pip install langgraph
```

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class State(TypedDict):
    user_message: str
    intent: str
    response: str

def classify_intent(state: State) -> State:
    # Use LLM to decide intent
    state['intent'] = 'screenshot'  # placeholder
    return state

def handle_screenshot(state: State) -> State:
    state['response'] = 'Screenshot taken'
    return state

def handle_unknown(state: State) -> State:
    state['response'] = "I don't know how to do that yet"
    return state

graph = StateGraph(State)
graph.add_node('classify', classify_intent)
graph.add_node('screenshot', handle_screenshot)
graph.add_node('unknown', handle_unknown)

graph.set_entry_point('classify')
graph.add_conditional_edges(
    'classify',
    lambda state: 'screenshot' if state['intent'] == 'screenshot' else 'unknown'
)
graph.add_edge('screenshot', END)
graph.add_edge('unknown', END)

app = graph.compile()
result = app.invoke({'user_message': 'show my screen', 'intent': '', 'response': ''})
```

## Score: 7/10 for Nexus's future state

Premature now. Worth revisiting when the command surface grows past simple dispatch.

## Alternatives

- smolagents (simpler)
- CrewAI (multi-agent)
- Hand-rolled state machine

## Links

- https://langchain-ai.github.io/langgraph/

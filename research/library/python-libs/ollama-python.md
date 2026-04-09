# Ollama (Python client)

## What it is

Ollama is a tool to run **large language models locally** on your machine — Llama 3, Mistral, Qwen, Phi, Gemma, and many more — with one-line install. The Python client lets you call them like an API.

## License

**MIT** (both Ollama itself and the Python client).

## Used for

- **Nexus.AI** — when you want zero-cost, zero-latency AI calls that don't depend on external APIs (which is Adil's #1 pain). Trade-off: smaller/dumber models than GPT-4, runs slower without GPU.
- **Privacy-sensitive operations** — anything where you don't want to send user data to a cloud provider

## Why it matters for Adil

Adil's main pain is "external APIs lag and fail". Ollama eliminates the network entirely for tasks where a small local model is good enough:

- Simple classification ("is this a question or a statement?")
- Short summarization
- Local function-call routing for Nexus commands ("did the user ask for image gen or status?")
- Quick vector search query rewriting

Big tasks (long generation, complex reasoning) still need GPT/Claude/Gemini. But every cheap local task offloaded = one less external API call.

## How to use

```bash
# Install Ollama itself first (separate program)
# Windows: download from ollama.com/download

# Pull a model
ollama pull qwen2.5:3b
ollama pull llama3.2:3b
ollama pull phi4

# Then in Python:
pip install ollama
```

```python
import ollama

response = ollama.chat(
    model='qwen2.5:3b',
    messages=[
        {'role': 'system', 'content': 'You classify intents.'},
        {'role': 'user', 'content': 'Take a screenshot of my desktop'},
    ]
)
print(response['message']['content'])
# → "intent: screenshot"
```

## Streaming

```python
stream = ollama.chat(
    model='llama3.2:3b',
    messages=[{'role': 'user', 'content': 'Tell me a story'}],
    stream=True,
)
for chunk in stream:
    print(chunk['message']['content'], end='', flush=True)
```

## Recommended models for Adil's laptop

Without a GPU, stick to **3B-8B** parameter models:
- **qwen2.5:3b** — fast, surprisingly capable, good for routing
- **llama3.2:3b** — Meta's small model, good general use
- **phi4** (14B but small footprint) — Microsoft, very strong reasoning for size
- **gemma2:2b** — fastest, simplest tasks

For image-related tasks, run `llava:7b` (multimodal) or `qwen2.5-vl`.

## Score: 8/10 for Nexus

Strong recommendation as a complement, not replacement. Use Ollama for fast local routing/classification, GPT/Gemini for the heavy lifting.

## Alternatives

- **llama-cpp-python** — lower level, more setup
- **vLLM** — for serving at scale (overkill for personal Nexus use)
- **LM Studio** — GUI version of similar idea

## Risks

- Models take RAM — a 7B model needs ~5GB RAM
- Without GPU, generation is slow (maybe 10-20 tokens/sec)
- Quality is lower than frontier API models

## Links

- https://ollama.com
- https://github.com/ollama/ollama-python

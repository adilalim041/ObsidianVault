# Library: Python libs

> Python ecosystem libraries, primarily for Nexus.AI (the only Python project).

## Telegram bot frameworks

- [aiogram.md](aiogram.md) — Modern async Telegram bot framework. Recommended over python-telegram-bot for new projects.
- [python-telegram-bot.md](python-telegram-bot.md) — The classic. Larger community.

## OS automation (for Nexus os_controller)

- [pyautogui.md](pyautogui.md) — Cross-platform mouse/keyboard/screenshot. **Already partially used in Nexus.**
- [pywinauto.md](pywinauto.md) — Windows-specific UI automation. Better for "click this specific button in this app".

## Vector memory / embeddings

- [chromadb.md](chromadb.md) — Local vector DB, easy setup. Good for assistant long-term memory.
- [lancedb.md](lancedb.md) — Faster, embedded, growing fast.

## Local LLM

- [ollama-python.md](ollama-python.md) — Run Llama/Mistral/Qwen locally, talk to them from Python. Useful for offline / privacy / cost reduction.

## AI agent frameworks

- [smolagents.md](smolagents.md) — HuggingFace's minimal agent framework. Lightweight, code-first.
- [crewai.md](crewai.md) — Multi-agent orchestration framework.
- [langgraph.md](langgraph.md) — Graph-based agent workflows. More complex but powerful.

## Voice (for Jarvis-style demos)

- [faster-whisper.md](faster-whisper.md) — Fast speech-to-text, runs locally. Critical for voice input.
- [piper-tts.md](piper-tts.md) — Fast local text-to-speech. Multiple voices, sounds decent.

## Structured AI output

- [instructor-py.md](instructor-py.md) — Same as instructor-js but for Python. Pydantic-based.

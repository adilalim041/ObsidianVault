# faster-whisper

## What it is

A reimplementation of OpenAI's Whisper speech-to-text model using **CTranslate2** — runs **4x faster** than the original Whisper, with the same accuracy. Works on CPU or GPU.

## License

**MIT.**

## Used for

- **Nexus.AI** — when adding voice input. Adil sends a voice note in Telegram → faster-whisper transcribes it locally → Nexus processes the text → responds.
- The "Jarvis demo" direction — voice in/voice out is the killer feature for viral demos

## Why it matters specifically for the Jarvis-style productization

Adil noted earlier that "Jarvis-style assistants sell because of the demo". Voice-in is the most demonstrable feature you can have. faster-whisper makes it practical to do this **locally** — no OpenAI Whisper API costs, no latency, no API failures.

## How to use

```bash
pip install faster-whisper
```

```python
from faster_whisper import WhisperModel

# Load model once at startup. Sizes: tiny, base, small, medium, large-v3
# For Adil's CPU laptop: 'small' is the sweet spot. ~500MB, decent quality.
model = WhisperModel("small", device="cpu", compute_type="int8")

# Transcribe a Telegram voice note (ogg/mp3/wav all work)
segments, info = model.transcribe("voice_note.ogg", language="ru")

print(f"Detected language: {info.language}")
text = " ".join(segment.text for segment in segments)
print(f"Transcript: {text}")
```

## Auto language detection

Don't pass `language=` and Whisper auto-detects (works very well for Russian + English).

## Score: 9/10 for Nexus's voice direction

If voice input is on the roadmap (it should be, for the Jarvis demo angle), use this. No reason to use the OpenAI API.

## Alternatives

- **OpenAI Whisper API** — pay per minute, network dependency, but best quality
- **whisper.cpp** — even faster, C++ based
- **Vosk** — older, smaller, faster but less accurate
- **Coqui STT** — discontinued

## Links

- https://github.com/SYSTRAN/faster-whisper

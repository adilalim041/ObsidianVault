# Piper TTS

## What it is

A fast, lightweight, **local** neural text-to-speech engine. Multiple voices in many languages, including Russian and English. Runs on CPU. Sounds significantly better than older local TTS like eSpeak.

## License

**MIT.**

## Used for

- **Nexus.AI** — voice OUTPUT to complement faster-whisper's voice INPUT. Together they enable the Jarvis-style "speak to me, I speak back" demo.
- Anywhere local TTS is needed without API costs

## Why it matters for the Jarvis direction

faster-whisper handles voice → text. Piper handles text → voice. Together: a complete local voice loop. No OpenAI TTS API costs, no network round-trips. The killer combo for Nexus's productizable demo angle.

## How to use

```bash
pip install piper-tts
# Download a voice (one-time, ~30MB each)
# Voices: https://huggingface.co/rhasspy/piper-voices
```

```python
from piper import PiperVoice
import wave

voice = PiperVoice.load("en_US-lessac-medium.onnx")

text = "Hello Adil, I have completed your request."

with wave.open("output.wav", "wb") as wav_file:
    voice.synthesize(text, wav_file)
```

## Russian voices

Piper has Russian voices — search for `ru_RU-*` in the voice list. Quality varies; test a few.

## Score: 9/10 for Nexus's voice direction

Pair with faster-whisper. If Nexus is going to have voice, this is the right TTS.

## Alternatives

- **OpenAI TTS API** — best quality, paid, network-dependent
- **ElevenLabs** — best quality, very expensive, viral-quality voices (would be ideal for the actual product launch demo)
- **Coqui XTTS** — also local, slower, more flexible
- **Edge TTS** — Microsoft's free TTS via API (still network-dependent)

## Recommendation

Start with Piper for development. When making the actual viral demo video for productization, splurge on **ElevenLabs** for the recording — its voices are noticeably more impressive and the demo is the product.

## Links

- https://github.com/rhasspy/piper
- Voice samples: https://rhasspy.github.io/piper-samples/

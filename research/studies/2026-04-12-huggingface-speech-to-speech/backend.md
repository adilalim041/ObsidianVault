# HuggingFace speech-to-speech — Backend Analysis

**Date:** 2026-04-12
**Repo:** https://github.com/huggingface/speech-to-speech
**Score:** 7.2
**Target project:** Nexus.AI (voice commands in Telegram bot)
**Analyst:** backend-expert subagent

---

## What this is

Real-time speech-to-speech pipeline: микрофон → VAD → STT → LLM → TTS → колонки. Написано на Python с threading. Поддерживает три режима транспорта: local (sounddevice), websocket (браузер), realtime (OpenAI Realtime API protocol).

Stack: Python, PyTorch, Transformers, Silero VAD, Whisper/faster-whisper/Parakeet, MeloTTS/Kokoro/Qwen3TTS, asyncio WebSocket, threading.Queue.

---

## Pattern 1 — Queue-connected handler chain (основа всей архитектуры)

Каждый этап пайплайна — отдельный `BaseHandler`, запущенный в собственном треде. Соединение между тредами — `queue.Queue`. Никаких callbacks, никаких event bus.

```python
# baseHandler.py
class BaseHandler:
    def __init__(self, stop_event, queue_in, queue_out, setup_args=(), setup_kwargs={}):
        self.stop_event = stop_event
        self.queue_in = queue_in
        self.queue_out = queue_out
        self.setup(*setup_args, **setup_kwargs)

    def run(self):
        while not self.stop_event.is_set():
            try:
                input = self.queue_in.get(timeout=0.1)  # timeout чтобы проверять stop_event
            except Empty:
                continue
            if isinstance(input, bytes) and input == b"END":
                break
            for output in self.process(input):   # process() — генератор
                self.queue_out.put(output)
        self.cleanup()
        self.queue_out.put(b"END")  # sentinel propagates downstream
```

`process()` — это **генератор**. Один входной элемент может породить несколько выходных (особенно LLM: одно предложение разбивается на sentence chunks для TTS).

Граф очередей в `s2s_pipeline.py`:
```
recv_audio_chunks_queue → [VAD] → spoken_prompt_queue
                                         ↓
                                      [STT] → stt_output_queue → [TranscriptionNotifier] → text_prompt_queue
                                                                                                  ↓
                                                                                               [LLM] → lm_response_queue
                                                                                                             ↓
                                                                                                  [LMOutputProcessor] → lm_processed_queue
                                                                                                                              ↓
                                                                                                                           [TTS] → send_audio_chunks_queue
```

**Почему это хорошо:** каждый этап работает с максимальной скоростью независимо. TTS начинает играть первое предложение пока LLM ещё генерирует второе. Это и есть "real-time" в этом проекте.

**Для Nexus.AI:** этот паттерн применим для обработки голосовых сообщений из Telegram. Вместо WebSocket транспорта — Telegram bot file download, вместо local audio streamer — получение OGG файла.

---

## Pattern 2 — Generation counter для cancellation (CancelScope)

Проблема: пользователь начал говорить пока AI ещё отвечает. Надо немедленно прервать текущую LLM генерацию и TTS.

Решение — не флаг и не Event, а **generation counter** (monotonic integer):

```python
# cancel_scope.py
class CancelScope:
    def __init__(self):
        self._gen: int = 0
        self._discarding: bool = False

    def cancel(self) -> None:
        # overflow-safe: после 4 млрд оборотов обернётся
        self._gen = (self._gen + 1) & 0xFFFFFFFF
        self._discarding = True

    def is_stale(self, gen: int) -> bool:
        return gen != self._gen
```

LLM и TTS захватывают `gen = cancel_scope.generation` в начале обработки. После каждого токена/чанка проверяют `cancel_scope.is_stale(gen)`:

```python
# language_model.py — внутри _stream_tokens
def _check_stop(self, gen: int | None, ctx: StreamContext) -> bool:
    if gen is not None and self.cancel_scope.is_stale(gen):
        ctx.cancelled = True
        return True
    ...

# melo_handler.py — TTS чекает каждый аудио блок
for i in range(0, len(audio_chunk), self.blocksize):
    if gen is not None and self.cancel_scope.is_stale(gen):
        logger.info("TTS generation cancelled (interruption)")
        return
    yield np.pad(audio_chunk[i : i + self.blocksize], ...)
```

**Почему counter, а не bool:** если пользователь говорит дважды пока AI отвечает, нужно не просто "отменить" а "отменить И запомнить что пришёл ещё один запрос". Counter это решает — каждый новый `cancel()` создаёт уникальный generation ID. Флаг пришлось бы сбрасывать руками и появился бы race condition.

**Для Nexus.AI:** если добавить очередь voice commands, похожий счётчик позволит отменять обработку старой команды при приходе новой (через `to_thread` + asyncio CancelledError).

---

## Pattern 3 — VAD с dual-mode (normal vs realtime transcription)

Silero VAD запускается на каждом аудио чанке (512 samples = 32ms при 16kHz). Два режима работы:

**Normal mode:** накапливает весь speech segment, отправляет в STT только когда детектирует конец речи (тишина > `min_silence_ms`).

**Realtime mode:** кроме финального сегмента, периодически отправляет промежуточные чанки для live transcription:

```python
# vad_handler.py
def _process_realtime(self, vad_output):
    if hasattr(self.iterator, "buffer") and len(self.iterator.buffer) > 0:
        current_time = time.time()
        if (current_time - self.last_process_time) >= self.realtime_processing_pause:
            array = torch.cat(self.iterator.buffer).cpu().numpy()
            duration_ms = len(array) / self.sample_rate * 1000
            if duration_ms >= self.min_speech_ms:
                yield ("progressive", array)   # <-- промежуточный результат
                self.last_process_time = current_time

    if vad_output is not None:
        # финальный сегмент после тишины
        yield ("final", array)
```

Deferred speech_started: событие `speech_started` эмитируется не сразу при первом звуке, а только когда буфер набрал `min_speech_ms` (500ms по умолчанию). Это убирает false positives от коротких шумов.

Параметры Silero VAD:
- `threshold=0.3` — вероятность речи (0..1)
- `min_silence_ms=1000` — сколько тишины = конец фразы
- `min_speech_ms=500` — минимальная длина речи (отсекает клики)
- `speech_pad_ms=30` — padding вокруг обнаруженного сегмента

**Для Nexus.AI:** для обработки voice message из Telegram VAD не нужен (Telegram сам нарезает голосовое). Но если когда-нибудь добавить real-time микрофон режим — использовать именно эту связку `silero-vad` + `VADIterator`.

---

## Pattern 4 — LLM streaming с sentence chunking для минимизации latency TTS

LLM генерирует токены. TTS не может работать с одним токеном — ему нужно законченное слово/предложение. Решение — буферизовать токены до границ предложений с помощью NLTK:

```python
# language_model.py — BaseLanguageModelHandler._process_printable_text
def _process_printable_text(self, printable_text, language_code, tools):
    sentences = sent_tokenize(printable_text)   # NLTK sentence tokenizer
    if len(sentences) > 1:
        for s in sentences[:-1]:
            chunks.append((s, language_code, []))
        printable_text = sentences[-1]   # последнее предложение — удерживаем (может быть незакончено)
    return chunks, tools, printable_text
```

Логика: если в буфере N предложений, отправляем N-1 в TTS, удерживаем последнее. Когда LLM генерирует конец последнего предложения (новую точку) — оно тоже уйдёт в TTS.

Для transformers backend используется `TextIteratorStreamer` — он запускает `pipe()` в отдельном треде, а `__iter__` выдаёт токены по мере их генерации:

```python
self.streamer = TextIteratorStreamer(
    self.tokenizer,
    skip_prompt=True,
    skip_special_tokens=True,
    timeout=1.0,   # важно: не None, иначе зависнет если генерация упадёт
)

# генерация в треде
thread = Thread(target=self.pipe, args=(chat_prompt,), kwargs=self.gen_kwargs)
thread.start()

# основной поток итерирует токены
yield from self._stream_tokens(self.streamer, gen, language_code, ctx)
```

**Warmup pattern:** каждый handler запускает `self.warmup()` при инициализации — прогоняет dummy input через модель. Без warmup первый реальный запрос занимал бы 3-5x дольше из-за JIT компиляции и CUDA kernel loading.

**Для Nexus.AI:** если добавить локальный LLM вместо Gemini API, использовать `TextIteratorStreamer` + sentence chunking для streaming ответов в Telegram (через bot.send_message с update по мере поступления текста).

---

## Pattern 5 — SESSION_END контрольное сообщение vs b"END" sentinel

Два разных типа управляющих сообщений в очереди:

```python
# pipeline_control.py
@dataclass(frozen=True)
class PipelineControlMessage:
    kind: str

SESSION_END = PipelineControlMessage("session_end")

# baseHandler.py — run()
if is_control_message(input, SESSION_END.kind):
    self.on_session_end()          # мягкий сброс состояния
    self.queue_out.put(input)      # propagate вниз по цепочке
    continue

if isinstance(input, bytes) and input == b"END":
    break                          # полная остановка треда
```

`SESSION_END` — это "пользователь отключился, сбросить state но не убивать тред". Каждый handler реализует `on_session_end()`:

```python
# vad_handler.py
def on_session_end(self):
    self.iterator.reset_states()
    self.iterator.buffer = []
    self.should_listen.set()    # снова начать слушать

# language_model.py
def on_session_end(self):
    self.chat.reset()            # очистить историю диалога
    self._function_tools = []
```

`b"END"` — это финальный sentinel, propagates через всю цепочку при shutdown. Каждый handler после выхода из loop кладёт `b"END"` в свою `queue_out` — следующий handler получает его и тоже завершается.

**Проблема которую это решает:** WebSocket клиент отключился, потом сразу подключился снова. Без SESSION_END VAD продолжал бы накапливать буфер, LLM продолжал бы старую историю диалога. Треды при этом не перезапускаются.

**Для Nexus.AI:** аналог — если Telegram user начинает новый разговор (после долгой паузы), нужно сбрасывать контекст. Сейчас в Nexus это делается через `user_sessions` dict, но паттерн session end message был бы чище при переходе на queue-based обработку.

---

## Pattern 6 — Runtime-configurable параметры через shared RuntimeConfig

Для realtime mode параметры VAD (threshold, silence_duration) можно менять прямо во время работы без рестарта пайплайна:

```python
# vad_handler.py
def _apply_runtime_turn_detection(self):
    if not self.runtime_config:
        return
    td_raw = self.runtime_config.session.audio.input.turn_detection
    if td_raw is self._last_turn_detection:   # identity check — не пересчитывать если не изменилось
        return

    td = td_raw.model_dump(exclude_none=True)  # Pydantic → dict

    if "threshold" in td:
        self.iterator.threshold = td["threshold"]
    if "silence_duration_ms" in td:
        self.iterator.min_silence_samples = self.sample_rate * td["silence_duration_ms"] / 1000
```

`RuntimeConfig` — это Pydantic модель, shared между handlers через `vars(kw)["runtime_config"] = runtime_config`. Каждый handler читает её в начале `process()`, сравнивает через identity (`is`) с последним виденным значением, применяет изменения если есть.

Identity check (`is` вместо `==`) — ключевой момент: если объект тот же самый, значит ничего не менялось. Не нужно сравнивать поля.

**Для Nexus.AI:** если добавить settings для голосового режима (скорость речи, язык TTS), похожий shared config позволит менять их через Telegram команду без рестарта.

---

## Pattern 7 — Audio buffering в WebSocket отправке

TTS выдаёт мелкие numpy chunks (512 samples = 1024 байт). Отправлять каждый отдельным WebSocket frame — плохо (overhead, jitter). Решение — буферизовать минимум 100ms перед отправкой:

```python
# websocket_streamer.py — _send_loop
MIN_AUDIO_BYTES = 3200  # 100ms @ 16kHz int16 (1600 samples * 2 bytes)
audio_buffer = bytearray()

while not self.stop_event.is_set():
    try:
        audio_chunk = self.output_queue.get_nowait()
        audio_buffer.extend(audio_chunk)

        if len(audio_buffer) >= MIN_AUDIO_BYTES:
            await asyncio.gather(
                *[client.send(bytes(audio_buffer)) for client in self.clients],
                return_exceptions=True,    # <-- не падать если один клиент отвалился
            )
            audio_buffer.clear()
    except Empty:
        # flush остатка если очередь опустела
        if audio_buffer and self.clients:
            await asyncio.gather(...)
```

`return_exceptions=True` в `gather` — важная деталь: если один из N клиентов отвалился, остальные всё равно получат аудио.

Входящий буфер (`recv_buffer`) с выравниванием: WebSocket фреймы не выровнены по 512 samples. Класс хранит remainder и достаёт полные чанки:

```python
recv_buffer.extend(message)
while len(recv_buffer) >= chunk_size_bytes:   # 512 * 2 bytes
    chunk = bytes(recv_buffer[:chunk_size_bytes])
    del recv_buffer[:chunk_size_bytes]
    self.input_queue.put(chunk)
```

---

## Nexus.AI integration plan

### Минимальный вариант: offline voice message processing

Telegram присылает `.ogg` файл. Текущий Nexus flow в `handlers/messages.py`:
1. Download file → конвертировать OGG → WAV/numpy
2. Передать в Whisper → получить текст
3. Обработать через существующий router/intent pipeline

Уже реализовано частично (в `handlers/messages.py` есть обработка voice). Улучшения из этого репо которые стоит взять:

- **Warmup pattern:** загружать Whisper модель при старте бота один раз, не при каждом voice message. Сейчас в Nexus `media_providers.py` создаёт клиентов при каждом вызове.
- **Language detection:** Whisper возвращает `language_code` вместе с транскрипцией. Это можно использовать для авто-выбора языка ответа.
- **Sentence chunking при TTS:** если добавить TTS для голосовых ответов, буферизовать по предложениям через NLTK перед синтезом.

### Полный вариант: real-time voice через WebSocket

Не применимо к Telegram bot напрямую. Telegram — pull-based (бот скачивает файл). Real-time streaming (как в этом репо) требует WebSocket соединение.

Если у Nexus когда-нибудь появится web UI — использовать `websocket_streamer.py` паттерн как есть.

---

## Gotchas из кода

1. **MPS (Apple Silicon) quirk:** `torch.mps.synchronize()` + `torch.mps.empty_cache()` + искусственная задержка `_ = time.time() - start` перед TTS на MPS. Без задержки `tts_to_file` падает с недетерминированными ошибками. Закомментировано самими авторами как "I'm looking into it".

2. **Whisper unsupported language fallback:** если Whisper возвращает язык не из SUPPORTED_LANGUAGES, повторяет inference с последним известным языком. Не пропускает аудио.

3. **TextIteratorStreamer timeout=1.0:** если `None` — при ошибке в generation thread streamer будет ждать вечно. Всегда ставить timeout.

4. **NLTK lazy download:** `nltk.data.find()` при импорте, `nltk.download()` только при LookupError. Не ломает import в средах без интернета если данные уже есть.

5. **MLX lock:** для Apple Silicon MLX бекенда используется `MLXLockContext` — глобальный lock предотвращает concurrent LLM+VLM inference (MLX не thread-safe для shared GPU memory).

---

## Libraries identified

| Library | Purpose | Install |
|---|---|---|
| `snakers4/silero-vad` | Voice Activity Detection | `torch.hub.load(...)` |
| `distil-whisper/distil-large-v3` | STT (fast Whisper) | HuggingFace Transformers |
| `faster-whisper` | STT (CTranslate2 backend, 4x faster) | `pip install faster-whisper` |
| `melo-tts` | TTS multi-language | `pip install melotts` |
| `kokoro` | TTS (high quality) | `pip install kokoro` |
| `TextIteratorStreamer` | LLM token streaming | transformers |
| `DeepFilterNet` (optional) | Audio enhancement/denoising | `pip install deepfilternet` |
| `librosa` | Audio resampling | `pip install librosa` |

---

## Score rationale: 7.2

Сильные стороны:
- Чистая, расширяемая архитектура
- Реальный production-grade cancellation pattern
- Хорошо покрывает VAD → STT → LLM → TTS весь pipeline

Минусы для Nexus:
- Telegram — async, этот код — threading (impedance mismatch)
- Нет Telegram-специфики вообще
- Модели тяжёлые для локального запуска (Whisper large-v3 = 1.5GB)
- Синхронная TTS не подойдёт для высокой concurrency

Применимость к Nexus: **паттерны** применимы, **код** — адаптировать нетривиально.

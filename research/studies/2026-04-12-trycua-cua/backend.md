# trycua/cua — Backend Analysis

**Repo:** https://github.com/trycua/cua
**Analyzed:** 2026-04-12
**Stack:** Python, asyncio, liteLLM, FastMCP, WebSocket, REST, PIL
**Relevance:** Nexus.AI — replaces/extends pyautogui-based RPA with structured agent loop

---

## Repo structure recap

```
libs/python/
├── agent/agent/
│   ├── agent.py              # ComputerAgent — main orchestrator
│   ├── decorators.py         # @register_agent registry
│   ├── types.py              # AgentConfigInfo, AgentCapability
│   ├── loops/
│   │   ├── base.py           # AsyncAgentConfig Protocol
│   │   ├── anthropic.py      # Claude computer-use loop
│   │   ├── openai.py         # OpenAI computer-use loop
│   │   ├── gemini.py         # Gemini loop
│   │   └── [17 more...]      # UI-TARS, OmniParser, Qwen, etc.
│   └── callbacks/
│       ├── base.py           # AsyncCallbackHandler ABC
│       ├── budget_manager.py # Cost cap enforcement
│       ├── image_retention.py # Context window image pruning
│       ├── trajectory_saver.py # Debug disk logging
│       ├── logging.py        # Verbose lifecycle logging
│       ├── operator_validator.py
│       └── prompt_instructions.py
├── computer/computer/
│   ├── computer.py           # Computer lifecycle (run/stop/restart)
│   ├── interface/
│   │   ├── base.py           # Abstract: screenshot, mouse, keyboard
│   │   ├── generic.py        # WebSocket + REST command transport
│   │   ├── linux.py / macos.py / windows.py / android.py
│   │   └── factory.py
│   └── models.py             # Display, Image, Computer dataclasses
└── mcp-server/mcp_server/
    ├── server.py             # FastMCP — exposes agent as MCP tools
    └── session_manager.py    # Multi-session pool
```

---

## Pattern 1: Registry decorator для agent loops

**Файл:** `libs/python/agent/agent/decorators.py`

CUA использует декоратор `@register_agent` для регистрации реализаций agent loop в глобальном реестре. `find_agent_config(model)` выбирает нужный loop по regex + приоритету — без if/elif на каждую модель.

```python
# decorators.py — полный источник
from typing import List, Optional
from .types import AgentConfigInfo

_agent_configs: List[AgentConfigInfo] = []


def register_agent(models: str, priority: int = 0, tool_type: Optional[str] = None):
    """
    Args:
        models: regex pattern, e.g. r"claude-.*"
        priority: higher = checked first
        tool_type: "browser" | "mobile" | None
    """
    def decorator(agent_class: type):
        # Protocol validation at registration time, not at call time
        for method in ("predict_step", "predict_click", "get_capabilities"):
            if not hasattr(agent_class, method):
                raise ValueError(f"{agent_class.__name__} must implement {method}")

        config_info = AgentConfigInfo(
            agent_class=agent_class,
            models_regex=models,
            priority=priority,
            tool_type=tool_type,
        )
        _agent_configs.append(config_info)
        _agent_configs.sort(key=lambda x: x.priority, reverse=True)
        return agent_class
    return decorator


def _strip_cua_prefix(model: str) -> str:
    """cua/google/gemini-3-flash-preview -> gemini-3-flash-preview"""
    parts = model.split("/")
    if parts[0] == "cua" and len(parts) >= 3:
        return "/".join(parts[2:])
    return model


def find_agent_config(model: str) -> Optional[AgentConfigInfo]:
    """Priority-ordered search, tries both raw and stripped model name."""
    stripped = _strip_cua_prefix(model)
    for config_info in _agent_configs:
        if config_info.matches_model(model):
            return config_info
        if stripped != model and config_info.matches_model(stripped):
            return config_info
    return None


# Usage — registration
@register_agent(models=r"claude-.*", priority=10)
class AnthropicAgentLoop:
    async def predict_step(self, messages, model, tools=None, **kwargs): ...
    async def predict_click(self, model, image_b64, instruction, **kwargs): ...
    def get_capabilities(self): return ["step", "click"]
```

**Nexus.AI применение:** Nexus уже имеет несколько провайдеров (Gemini, Luma, Veo). Этот паттерн заменит if/elif в `media_providers.py` — каждый провайдер регистрирует себя с `@register_provider(models=r"gemini-.*")`, `find_provider_config(model)` выбирает автоматически.

---

## Pattern 2: AsyncCallbackHandler — 15-hook lifecycle система

**Файл:** `libs/python/agent/agent/callbacks/base.py`

Полная цепочка хуков вокруг каждой операции агента. Все методы — no-op по умолчанию, subclass переопределяет только нужные. Ключевой момент: `on_run_continue()` возвращает `bool` — если `False`, цикл останавливается.

```python
# callbacks/base.py — полный источник
from abc import ABC
from typing import Any, Dict, List, Optional, Union


class AsyncCallbackHandler(ABC):
    # Run lifecycle
    async def on_run_start(self, kwargs: Dict[str, Any], old_items: List[Dict[str, Any]]) -> None:
        pass

    async def on_run_end(self, kwargs, old_items, new_items) -> None:
        pass

    async def on_run_continue(self, kwargs, old_items, new_items) -> bool:
        return True  # False = stop the loop

    # LLM lifecycle
    async def on_llm_start(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return messages  # can mutate messages before API call

    async def on_llm_end(self, output: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return output

    # Tool execution
    async def on_computer_call_start(self, item: Dict[str, Any]) -> None: pass
    async def on_computer_call_end(self, item, result) -> None: pass
    async def on_function_call_start(self, item: Dict[str, Any]) -> None: pass
    async def on_function_call_end(self, item, result) -> None: pass

    # API-level
    async def on_api_start(self, kwargs: Dict[str, Any]) -> None: pass
    async def on_api_end(self, kwargs, result) -> None: pass

    # Data events
    async def on_text(self, item: Dict[str, Any]) -> None: pass
    async def on_usage(self, usage: Dict[str, Any]) -> None: pass
    async def on_screenshot(self, screenshot: Union[str, bytes], name: str = "screenshot") -> None: pass
    async def on_responses(self, kwargs, responses) -> None: pass
```

**BudgetManagerCallback — пример использования:**

```python
# callbacks/budget_manager.py — полный источник
class BudgetExceededError(Exception):
    pass


class BudgetManagerCallback(AsyncCallbackHandler):
    def __init__(self, max_budget: float, reset_after_each_run: bool = True, raise_error: bool = False):
        self.max_budget = max_budget
        self.reset_after_each_run = reset_after_each_run
        self.raise_error = raise_error
        self.total_cost = 0.0

    async def on_run_start(self, kwargs, old_items) -> None:
        if self.reset_after_each_run:
            self.total_cost = 0.0

    async def on_usage(self, usage: Dict[str, Any]) -> None:
        if "response_cost" in usage:
            self.total_cost += usage["response_cost"]

    async def on_run_continue(self, kwargs, old_items, new_items) -> bool:
        if self.total_cost >= self.max_budget:
            if self.raise_error:
                raise BudgetExceededError(
                    f"Budget exceeded: ${self.total_cost} >= ${self.max_budget}"
                )
            print(f"Budget exceeded: ${self.total_cost} >= ${self.max_budget}")
            return False
        return True
```

**Nexus.AI применение:** `rpa_*` handlers в `callbacks.py` сейчас не имеют хуков — всё встроено прямо в функции. Заменить на `RPACallbackHandler` с `on_computer_call_start` (показывает пользователю "сейчас выполню: click(500,300)") и `on_run_continue` (проверяет, не нажал ли пользователь Stop в Telegram inline кнопке). Это уберёт текущий монолитный код подтверждения из `callbacks.py`.

---

## Pattern 3: Image retention — управление контекстным окном

**Файл:** `libs/python/agent/agent/callbacks/image_retention.py`

Критический паттерн для long-running RPA: скриншоты накапливаются в истории и переполняют контекстное окно. `ImageRetentionCallback` удаляет старые скриншоты вместе со связанными `computer_call` и `reasoning` элементами — тройками, не по одному.

```python
# callbacks/image_retention.py — полный источник
class ImageRetentionCallback(AsyncCallbackHandler):
    def __init__(self, only_n_most_recent_images: Optional[int] = None):
        self.only_n_most_recent_images = only_n_most_recent_images

    async def on_llm_start(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if self.only_n_most_recent_images is None:
            return messages
        return self._apply_image_retention(messages)

    def _apply_image_retention(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        # Find all messages that carry a screenshot
        output_indices: List[int] = []
        for idx, msg in enumerate(messages):
            if msg.get("type") == "computer_call_output":
                out = msg.get("output")
                if isinstance(out, dict) and "image_url" in out:
                    output_indices.append(idx)

        if len(output_indices) <= self.only_n_most_recent_images:
            return messages  # nothing to trim

        keep_output_indices = set(output_indices[-self.only_n_most_recent_images:])
        to_remove: set[int] = set()

        for idx in output_indices:
            if idx in keep_output_indices:
                continue
            to_remove.add(idx)  # remove the screenshot output

            # Also remove the computer_call that produced it
            call_id = messages[idx].get("call_id")
            prev_idx = idx - 1
            if (
                prev_idx >= 0
                and messages[prev_idx].get("type") == "computer_call"
                and messages[prev_idx].get("call_id") == call_id
            ):
                to_remove.add(prev_idx)
                # And the reasoning step before the call, if present
                r_idx = prev_idx - 1
                if r_idx >= 0 and messages[r_idx].get("type") == "reasoning":
                    to_remove.add(r_idx)

        return [m for i, m in enumerate(messages) if i not in to_remove]
```

**Nexus.AI применение:** В `generate_pyautogui_step()` каждый шаг берёт скриншот и отправляет в Gemini. После 5–10 шагов история разрастается. Применить эту логику к `user_sessions[user_id]` — хранить последние 3 скриншота, остальные дропать вместе с соответствующими action entries.

---

## Pattern 4: Retry с экспоненциальным backoff — только на retryable ошибки

**Файл:** `libs/python/agent/agent/agent.py` (описан через анализ кода)

CUA реализует retry только на уровне agent loop, чтобы не складываться с inner LiteLLM retries. Ключевой момент: `_is_retryable_error()` проверяет конкретные типы исключений liteLLM, а не ловит всё подряд.

```python
# agent.py — retry pattern (реконструирован из анализа)
import asyncio
from typing import Any


RETRYABLE_PATTERNS = [
    "timeout",
    "rate limit",
    "rate_limit",
    "service unavailable",
    "overloaded",
    "connection",
]


def _is_retryable_error(exc: Exception) -> bool:
    """Only retry transient infrastructure errors, not logic errors."""
    import litellm
    retryable_types = (
        litellm.exceptions.RateLimitError,
        litellm.exceptions.Timeout,
        litellm.exceptions.ServiceUnavailableError,
        litellm.exceptions.APIConnectionError,
    )
    if isinstance(exc, retryable_types):
        return True
    # Fallback: check message text for known patterns
    msg = str(exc).lower()
    return any(pattern in msg for pattern in RETRYABLE_PATTERNS)


async def _predict_step_with_retry(
    agent_loop,
    loop_kwargs: dict,
    hooks: dict,
    max_retries: int = 3,
    base_delay: float = 2.0,
) -> Any:
    """
    Retry only at agent loop level.
    LiteLLM has its own internal retries — don't stack them.
    """
    last_exc = None
    for attempt in range(max_retries + 1):
        try:
            return await agent_loop.predict_step(**loop_kwargs, **hooks)
        except Exception as exc:
            if not _is_retryable_error(exc):
                raise  # non-retryable: bubble up immediately
            last_exc = exc
            if attempt < max_retries:
                delay = base_delay * (2 ** attempt)  # 2s, 4s, 8s
                await asyncio.sleep(delay)
    raise last_exc
```

**Nexus.AI применение:** Текущий gotcha — "external API calls are unreliable." `media_providers.py` в `to_thread` просто упадёт без retry. Применить этот точечный паттерн: `_is_retryable_error` проверяет `requests.Timeout`, `requests.ConnectionError`, HTTP 429/503, и только их ретраит с backoff. Не ретраить `ValueError` (неправильный prompt) и `AuthenticationError`.

---

## Pattern 5: REST-first / WebSocket-fallback transport с keep-alive

**Файл:** `libs/python/computer/computer/interface/generic.py`

`GenericComputerInterface` — двойной транспорт: сначала REST POST `/cmd`, при ошибке переключается на WebSocket. WebSocket держится `_keep_alive()` задачей с exponential backoff reconnect.

```python
# interface/generic.py — паттерн (реконструирован из анализа)
import asyncio
import aiohttp
import json
from typing import Optional, Dict, Any


class GenericComputerInterface:
    _api_port: int  # 8000 (unsecured) or 8443 (with API key)
    _ws: Optional[aiohttp.ClientWebSocketResponse] = None
    _recv_lock: asyncio.Lock
    _keep_alive_task: Optional[asyncio.Task] = None

    async def _send_command(self, command: str, params: Optional[Dict] = None) -> Any:
        """REST-first with WebSocket fallback."""
        try:
            result = await self._send_command_rest(command, params)
            # REST can return soft-error strings
            if isinstance(result, dict) and result.get("error") in ("Request failed", None):
                return result
            return result
        except Exception as rest_err:
            if "Request failed" in str(rest_err) or "malformed response" in str(rest_err):
                return await self._send_command_ws(command, params)
            raise

    async def _send_command_rest(self, command: str, params: Optional[Dict] = None) -> Any:
        url = f"http://localhost:{self._api_port}/cmd"
        headers = {}
        if self._api_key:
            headers["X-API-Key"] = self._api_key
        payload = {"command": command, "params": params or {}}
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                text = await resp.text()
                # Server prefixes responses with "data: "
                if text.startswith("data: "):
                    return json.loads(text[6:])
                return {"error": "malformed response", "raw": text}

    async def _send_command_ws(self, command: str, params: Optional[Dict] = None) -> Any:
        """3 retries, 1s interval, 120s per-command timeout."""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                await self._ensure_connection()
                payload = json.dumps({"command": command, "params": params or {}})
                async with self._recv_lock:
                    await self._ws.send_str(payload)
                    msg = await asyncio.wait_for(self._ws.receive(), timeout=120.0)
                    return json.loads(msg.data)
            except Exception as e:
                if attempt == max_retries - 1:
                    # Log at ERROR only on final failure
                    import logging
                    logging.getLogger(__name__).error(
                        "WebSocket command failed after %d attempts: %s", max_retries, e
                    )
                    raise
                await asyncio.sleep(1.0)

    async def _keep_alive(self):
        """Background task — reconnects with exponential backoff, max 30s."""
        delay = 1.0
        attempt = 0
        while True:
            try:
                await asyncio.sleep(5.0)  # ping interval
                if self._ws is None or self._ws.closed:
                    # Log verbosely only on first attempt, then every 500th
                    if attempt == 0 or attempt % 500 == 0:
                        import logging
                        logging.getLogger(__name__).info(
                            "WebSocket reconnecting (attempt %d, delay=%.1fs)", attempt, delay
                        )
                    self._ws = await self._connect()
                    delay = 1.0  # reset on success
                    attempt = 0
            except Exception:
                delay = min(delay * 2, 30.0)
                attempt += 1
                await asyncio.sleep(delay)

    async def wait_for_ready(self, timeout: float = 60.0):
        """Poll until server responds — logs every 10s to avoid flooding."""
        start = asyncio.get_event_loop().time()
        last_log = start
        while True:
            try:
                await self._send_command("get_screen_size")
                return  # success
            except Exception:
                now = asyncio.get_event_loop().time()
                if now - start > timeout:
                    raise TimeoutError("Computer interface not ready after 60s")
                if now - last_log >= 10.0:
                    import logging
                    logging.getLogger(__name__).info("Waiting for computer interface...")
                    last_log = now
                await asyncio.sleep(1.0)

    # Action methods — all follow the same pattern
    async def left_click(self, x: int, y: int, delay: Optional[float] = None) -> None:
        await self._send_command("left_click", {"x": x, "y": y})
        await self._handle_delay(delay)

    async def type_text(self, text: str, delay: Optional[float] = None) -> None:
        await self._send_command("type_text", {"text": text})
        await self._handle_delay(delay)

    async def screenshot(self) -> bytes:
        result = await self._send_command("screenshot")
        return result["data"]  # raw bytes

    async def _handle_delay(self, delay: Optional[float]) -> None:
        if delay is not None and delay > 0:
            await asyncio.sleep(delay)
```

**Nexus.AI применение:** Текущий `os_controller.py` запускает subprocess напрямую без retry/timeout. Эта же структура (try REST → fallback WebSocket, или try subprocess → fallback альтернативный метод) с `wait_for_ready` подходит для инициализации pyautogui — проверить что экран доступен перед первым кликом.

---

## Pattern 6: Coordinate scaling для скриншотов

**Файл:** `libs/python/agent/agent/loops/anthropic.py`

Когда скриншот > 1024×768, Anthropic API требует downscale, но возвращает координаты в пространстве сжатого изображения. CUA хранит `scale_x`/`scale_y` факторы и upscales координаты обратно перед выполнением клика.

```python
# anthropic.py — coordinate scaling pattern (реконструирован)
import base64
from io import BytesIO
from typing import Optional, Tuple

RECOMMENDED_MAX_WIDTH = 1024
RECOMMENDED_MAX_HEIGHT = 768


def _downscale_screenshot_if_needed(
    image_b64: str,
) -> Tuple[str, float, float]:
    """
    Returns: (new_b64, scale_x, scale_y)
    scale_x/scale_y = new_size / original_size
    If no downscale needed, returns original + 1.0, 1.0
    """
    try:
        from PIL import Image
        header, data = image_b64.split(",", 1) if "," in image_b64 else ("", image_b64)
        img_bytes = base64.b64decode(data)
        img = Image.open(BytesIO(img_bytes))
        w, h = img.size

        if w <= RECOMMENDED_MAX_WIDTH and h <= RECOMMENDED_MAX_HEIGHT:
            return image_b64, 1.0, 1.0  # no scaling needed

        scale = min(RECOMMENDED_MAX_WIDTH / w, RECOMMENDED_MAX_HEIGHT / h)
        new_w, new_h = int(w * scale), int(h * scale)

        img_resized = img.resize((new_w, new_h), Image.LANCZOS)
        buf = BytesIO()
        img_resized.save(buf, format="PNG")
        new_b64 = base64.b64encode(buf.getvalue()).decode()
        if header:
            new_b64 = f"{header},{new_b64}"

        return new_b64, new_w / w, new_h / h  # scale < 1.0

    except Exception:
        return image_b64, 1.0, 1.0  # graceful fallback


def _scale_coordinate(coord: int, scale: float) -> int:
    """Upscale model coordinate back to original screen space."""
    return int(round(coord / scale))


# Usage in predict_step:
# 1. Downscale before sending to API
# scaled_b64, sx, sy = _downscale_screenshot_if_needed(screenshot_b64)
# send scaled_b64 to LLM

# 2. Upscale returned coordinates before executing click
# x_screen = _scale_coordinate(model_x, sx)
# y_screen = _scale_coordinate(model_y, sy)
# await computer.left_click(x_screen, y_screen)
```

**Nexus.AI применение:** `generate_pyautogui_step()` отправляет скриншот в Gemini и получает координаты для клика. Если экран 1920×1080, но отправляется полный скриншот — модель может вернуть неточные координаты. Применить этот паттерн: downscale до 1024×768 перед Gemini, upscale координаты перед `pyautogui.click()`.

---

## Pattern 7: MCP server как транспортный слой для agent

**Файл:** `libs/python/mcp-server/mcp_server/server.py`

FastMCP expose-ит ComputerAgent как три инструмента: `screenshot_cua`, `run_cua_task`, `run_multi_cua_tasks`. Multi-task поддерживает sequential и concurrent режимы через `asyncio.gather`. Session pool через контекстный менеджер.

```python
# server.py — ключевые паттерны (из полного источника)
import asyncio
import uuid
from typing import Any, Dict, List, Optional, Tuple, Union
from mcp.server.fastmcp import Context, FastMCP
from mcp.server.fastmcp.utilities.types import Image

server = FastMCP(name="cua-agent")


@server.tool(structured_output=False)
async def run_cua_task(ctx: Context, task: str, session_id: Optional[str] = None) -> Any:
    """Run a Computer-Use Agent task, return (text_result, screenshot)."""
    session_manager = get_session_manager()
    task_id = str(uuid.uuid4())

    async with session_manager.get_session(session_id) as session:
        await session_manager.register_task(session.session_id, task_id)
        try:
            agent = ComputerAgent(
                model=os.getenv("CUA_MODEL_NAME", "anthropic/claude-sonnet-4-5-20250929"),
                only_n_most_recent_images=int(os.getenv("CUA_MAX_IMAGES", "3")),
                verbosity=logging.INFO,
                tools=[session.computer],
            )
            messages = [{"role": "user", "content": task}]
            aggregated_messages: List[str] = []

            async for result in agent.run(messages):
                outputs = result.get("output", [])
                for output in outputs:
                    output_type = output.get("type")
                    if output_type == "message":
                        text = _extract_text_from_content(output.get("content"))
                        if text:
                            aggregated_messages.append(text)
                    # tool_use, computer_call, function_call — dispatch progress to ctx

            screenshot = await session.computer.interface.screenshot()
            return (
                "\n".join(aggregated_messages).strip() or "Task completed with no text output.",
                Image(format="png", data=screenshot),
            )
        finally:
            await session_manager.unregister_task(session.session_id, task_id)


@server.tool(structured_output=False)
async def run_multi_cua_tasks(
    ctx: Context, tasks: List[str], session_id: Optional[str] = None, concurrent: bool = False
) -> Any:
    """Run multiple tasks, optionally concurrent."""
    if concurrent and len(tasks) > 1:
        async def run_with_progress(i: int, task: str) -> Tuple[int, Any]:
            ctx.report_progress(i / len(tasks))
            result = await run_cua_task(ctx, task, session_id)
            ctx.report_progress((i + 1) / len(tasks))
            return i, result

        results_with_indices = await asyncio.gather(
            *[run_with_progress(i, t) for i, t in enumerate(tasks)],
            return_exceptions=True,
        )
        # sort and handle exceptions
        results = []
        for r in results_with_indices:
            if isinstance(r, Exception):
                results.append((f"Task failed: {str(r)}", Image(format="png", data=b"")))
            else:
                _, task_result = r
                results.append(task_result)
        return results
    else:
        results = []
        for i, task in enumerate(tasks):
            ctx.report_progress(i / len(tasks))
            results.append(await run_cua_task(ctx, task, session_id))
        return results
```

**Nexus.AI применение:** Nexus уже имеет `/research` и vault tools. Если Nexus экспортирует свои RPA инструменты через MCP, другие агенты (Claude Desktop, Cursor) смогут использовать Nexus как computer-use backend. `run_multi_cua_tasks` с `concurrent=True` → `asyncio.gather` с обработкой `return_exceptions=True` — готовый паттерн для параллельного запуска нескольких независимых RPA шагов.

---

## Сводка: что брать в Nexus.AI

| Паттерн | Приоритет | Что заменяет в Nexus |
|---------|-----------|---------------------|
| Registry decorator | Средний | `if/elif` в `media_providers.py` |
| AsyncCallbackHandler | Высокий | Монолитный код подтверждения в `rpa_*` handlers |
| ImageRetentionCallback | Высокий | Бесконтрольный рост `user_sessions` со скриншотами |
| Retry с retryable-check | Высокий | Нет retry в `media_providers.py` и `api_client.py` |
| Coordinate scaling | Средний | Неточные координаты от Gemini на full-res скриншотах |
| MCP server pattern | Низкий | Будущий экспорт Nexus tools как MCP endpoint |

### Важный gotcha из CUA

CUA намеренно НЕ retry-ит на уровне individual API calls внутри loops — потому что liteLLM уже делает inner retries. Если добавить retry сверху, получишь `max_retries²` попыток. В Nexus: если использовать `p-retry` или собственный backoff для Gemini calls, убедись что SDK сам не ретраит.

### Ещё один gotcha: `_recv_lock` для WebSocket

WebSocket команды сериализованы через `asyncio.Lock` (`_recv_lock`). Без него параллельные `await ws.receive()` получат чужие ответы. Если в Nexus появится WebSocket к внешнему сервису — обязательно serialize recv через Lock.

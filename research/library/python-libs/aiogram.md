# aiogram

## What it is

A modern, async-first Python framework for Telegram bots. Built on top of `aiohttp`. Clean API, type hints throughout, supports the full Telegram Bot API.

## License

**MIT.**

## Used for

- **Nexus.AI** — alternative to whatever Telegram lib `bot.py` currently uses. Adil should consider this if migrating from `python-telegram-bot`, especially when adding more commands.

## Why it matters for Nexus specifically

Nexus is going to grow into a "huge agent" with many commands and integrations (per backlog). aiogram's pattern of routers, filters, and FSM (finite state machine) is the cleanest way to organize many commands without `bot.py` becoming a 2000-line monster.

## How to use

```bash
pip install aiogram
```

```python
from aiogram import Bot, Dispatcher, Router
from aiogram.filters import Command
from aiogram.types import Message
import asyncio

bot = Bot(token="<TELEGRAM_BOT_TOKEN>")
dp = Dispatcher()
router = Router()

@router.message(Command("start"))
async def cmd_start(message: Message):
    await message.answer("Hello! I'm Nexus.")

@router.message(Command("status"))
async def cmd_status(message: Message):
    # Check Adil's project status here
    await message.answer("All projects healthy ✅")

dp.include_router(router)

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
```

## Multi-router structure (for many commands)

```python
# routers/projects.py
from aiogram import Router
router = Router()

@router.message(Command("status"))
async def status_handler(...): ...

# main.py
from routers import projects, media, os_control
dp.include_router(projects.router)
dp.include_router(media.router)
dp.include_router(os_control.router)
```

This is exactly the architectural cleanup Nexus needs.

## Score: 9/10 for Adil

Strong recommendation. When Nexus does the architectural cleanup mentioned in its backlog, adopt aiogram if it's not already in use.

## Alternatives

- **python-telegram-bot** — older, larger community, sync-friendly. Fine for small bots.
- **pyrogram** — uses MTProto directly (not Bot API), more powerful but more complex
- **telebot** (pyTelegramBotAPI) — simpler, less structured

## Links

- https://docs.aiogram.dev

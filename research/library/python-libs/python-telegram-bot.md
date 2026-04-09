# python-telegram-bot

## What it is

The classic, mature Python framework for Telegram bots. Largest community, most tutorials, most StackOverflow answers. Async since v20.

## License

**LGPL-3.0** — important to read carefully. LGPL allows commercial use of libraries, but if you modify the library itself, those modifications must be shared. **Using as a dependency in a closed-source product is OK.**

## Used for

- **Nexus.AI** — possibly already in use (need to verify against `bot.py`). If so, no rush to migrate.

## How to use

```bash
pip install python-telegram-bot
```

```python
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Hello! I'm Nexus.")

app = Application.builder().token("<TELEGRAM_BOT_TOKEN>").build()
app.add_handler(CommandHandler("start", start))
app.run_polling()
```

## Score: 7/10 for Adil

Fine if already used. If starting fresh, prefer aiogram (cleaner async patterns, MIT license).

## License caveat — read carefully

LGPL is OK for dependency use (Nexus calls the library, but doesn't modify it). However, if Adil ever wants to modify python-telegram-bot itself or distribute a fork, those changes would need to be open-source. This is unusual for a Python package. Most users have no problem.

## Links

- https://python-telegram-bot.org

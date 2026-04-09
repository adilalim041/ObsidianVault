# PyAutoGUI

## What it is

A Python library for controlling the **mouse, keyboard, and screen** programmatically. Cross-platform (Windows, macOS, Linux). Can move/click the mouse, type keystrokes, take screenshots, find images on the screen.

## License

**BSD-3-Clause.** Commercial-friendly.

## Used for

- **Nexus.AI `os_controller.py`** — almost certainly already used or about to be. This is the Python equivalent of the Jarvis "open browser, click thing, type this" capability.

## Why it matters for Adil specifically

Adil's Nexus vision (and the Jarvis-style productizable demo) requires: "open browser → search for X → click result → take screenshot → return to me". PyAutoGUI is the foundation for all of this.

## How to use

```bash
pip install pyautogui
```

```python
import pyautogui

# Move mouse and click
pyautogui.moveTo(500, 300, duration=0.5)
pyautogui.click()

# Type
pyautogui.write('Hello, world!', interval=0.05)
pyautogui.press('enter')

# Hotkey
pyautogui.hotkey('ctrl', 'c')

# Screenshot
screenshot = pyautogui.screenshot()
screenshot.save('screen.png')

# Find image on screen (powerful for "click on this button")
location = pyautogui.locateOnScreen('chrome_icon.png', confidence=0.9)
if location:
    pyautogui.click(location)
```

## Image-based UI control (the killer feature)

```python
# Click whatever button looks like 'submit_button.png'
button = pyautogui.locateCenterOnScreen('submit_button.png', confidence=0.8)
if button:
    pyautogui.click(button)
```

This makes Nexus able to drive any GUI app without knowing its internals — just give it a screenshot of the button to click.

## ⚠️ Safety notes (critical for `os_controller.py`)

- **Failsafe:** by default, moving mouse to top-left corner aborts the script. Keep this on.
  ```python
  pyautogui.FAILSAFE = True  # default; do NOT disable
  ```
- **Pause:** add a small pause between actions
  ```python
  pyautogui.PAUSE = 0.1
  ```
- **Whitelist commands** at the bot level — never let an arbitrary chat message become an arbitrary `pyautogui.write()`. Confirm dangerous actions in chat first.
- **Lock to your Telegram chat ID** — never accept commands from anyone else.

## Score: 10/10 for Adil

For Nexus's OS control feature, this is the foundational library. Already aligned with the project's direction.

## Alternatives

- **pywinauto** — Windows-only, but understands native UI elements (not just pixels). Better for "click the button labeled 'OK' in this app".
- **pynput** — lower-level keyboard/mouse, no screen functions
- **AutoIt** (via Python bindings) — Windows automation classic, less Pythonic

## Links

- https://pyautogui.readthedocs.io

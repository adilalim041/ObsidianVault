# pywinauto

## What it is

A **Windows-only** Python library for automating native Windows GUI applications. Unlike PyAutoGUI (which works at the pixel level), pywinauto **understands the actual UI tree** — buttons, windows, menus, text fields — using accessibility APIs.

## License

**BSD-3-Clause.**

## Used for

- **Nexus.AI** — when the OS control needs to interact with a specific Windows application (Notepad, Chrome, native programs) and you want to find a button by its name, not by pixel coordinates.

## Why it matters

PyAutoGUI works on screenshots — fragile if the app moves, theme changes, or DPI scales. pywinauto reads the actual control tree — `app.window(title='Notepad').Edit.type_keys('hello')` works regardless of where the window is.

For Nexus running on Adil's Windows machine, pywinauto is more robust for native apps.

## How to use

```bash
pip install pywinauto
```

```python
from pywinauto import Application

# Start or connect to an app
app = Application(backend='uia').start('notepad.exe')
notepad = app.window(title='Untitled - Notepad')

# Type into the edit field
notepad.Edit.type_keys('Hello from Nexus', with_spaces=True)

# Click a menu
notepad.menu_select('File -> Save As')

# Connect to an already-running Chrome
chrome = Application(backend='uia').connect(title_re='.*Chrome.*')
chrome.window().print_control_identifiers()  # explore the tree
```

## When to use pywinauto vs pyautogui

| Situation | Use |
|---|---|
| Click a button identified by its text label | pywinauto |
| Click a button you can describe by image only | pyautogui |
| Type into a known text field | pywinauto |
| Type at the current cursor position | pyautogui |
| Take a screenshot | pyautogui |
| Read pixel colors | pyautogui |
| Cross-platform | pyautogui |
| Windows-only, robust against UI shifts | pywinauto |

## Score: 8/10 for Adil

Use alongside PyAutoGUI. They solve different problems.

## Risks

- **Windows only.** If Nexus ever needs to run on macOS/Linux, pywinauto code doesn't port.
- Steeper learning curve than PyAutoGUI.

## Links

- https://pywinauto.readthedocs.io

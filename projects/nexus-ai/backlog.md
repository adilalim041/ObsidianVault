# Nexus.AI — Backlog

## Active threads

- **Upgrade weak AI models** — current text and image models are placeholders; need to pick real ones
- **Fix API reliability** — same pattern as News.AI

## Near-term

- Document which model is currently in use (verification task — see `architecture.md` TODOs)
- Identify which image providers are in `media_providers.py`
- Add structured logging around external API calls

## Medium-term

- **Expand the command surface significantly** — make Nexus a "huge agent" in terms of what it can do
- **Architectural cleanup** — make it easy to add new commands/integrations safely
- Add more integrations (which ones? — to be decided)
- Lock down `os_controller.py` properly: whitelist, per-action confirmation policy, logging
- Verify `runtime_guard.py` actually does something meaningful

## Long-term (if pursuing as product)

- Package as a consumer product with the "Jarvis demo" framing (see overview.md)
- Build a viral-friendly demo: voice in/out, visible-on-screen actions, satisfying confirmations
- Migrate `memory.py` to a cloud DB so multi-user is possible
- Adil's laptop-tied design becomes a problem here — will need rethinking

## Explicitly NOT doing (yet)

- Any kind of public release before security review of `os_controller.py`
- Voice interface (would be cool but not on the immediate path)
- Multi-user (would require major rework)

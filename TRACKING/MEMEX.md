## LifeOS MEMEX Instructions

- When asked to **"Sync Memex"**, update the markdown files in the `TRACKING` folder:
  - `progress.md`
  - `goals.md`
  - `structure.md`
  - `MEMEX.md`
- Recent notes:
  - Auth UX: error surfacing added for wrong password/missing user; landing page fail-open to avoid redirect loops; proxy (renamed from middleware) guards dashboard when no session.
  - Phase 3 (Core Dashboard & Gamification) added to progress as upcoming (not complete).
- Do **not** use `TRACKING` files as active runtime context for application logic unless explicitly requested.
- Treat `TRACKING` as a **meta layer** for planning, reflection, and project oversight rather than live configuration.


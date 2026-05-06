## LifeOS MEMEX Instructions

- When asked to **"Sync Memex"**, update the markdown files in the `TRACKING` folder:
  - `progress.md`
  - `goals.md`
  - `structure.md`
  - `MEMEX.md`
  - `SESSION_CONTEXT.md`
- Do **not** use `TRACKING` files as active runtime context for application logic unless explicitly requested.
- Treat `TRACKING` as a **meta layer** for planning, reflection, and project oversight rather than live configuration.

## Session Log

### Day 1 (prior)
- Phase C (Journal System & Encrypted Mood Tracker) deployed.
- Phase D (AI Oracle via Gemini API) deployed and connected to user context.
- Phase E (Economy V2: Daily Streaks & Level Logs) implemented.
- Type errors squashed → 100% COMPLETION verified.

### Day 2 (2026-05-07 — first session)
- History & Journal Calendar: HistoryCalendar.tsx rewritten with month nav, journal note per day, task highlight cross-reference.
- Habit Grid: HabitGrid.tsx — quests as gamified habits with level badges (Novice→Master), XP progress bars, streak counter.
- Habit Server Action: habitService.ts — completeHabit (streak bonus XP), spendXP (XP currency for shop).
- Indulgence Shop V2: IndulgenceShop.tsx — full buy/add/affordability UI using spendXP.
- New sidebar tabs: Habit Grid, History & Journal.

### Day 3 (2026-05-07 — second session)
- Phase 3 (Planning & Academic Tracker) fully implemented.
- PersonalPlanner.tsx: 14-day horizontal scroll calendar, task cards, Add Task dialog.
- TaskTable.tsx: shadcn Table with Sort-by-Urgency (score = priority×25 + deadline proximity).
- AcademicTracker.tsx: per-subject attendance % bars, present/absent/late logging, target color coding.
- DB: tasks + academic_subjects + attendance_records tables (migration 02_phase3_planner.sql).
- New sidebar tab: Planner.
- database.types.ts updated with all 3 new tables (UTF-16 LE encoding — use Node.js to edit).

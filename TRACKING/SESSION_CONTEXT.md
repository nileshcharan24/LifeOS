# LifeOS — Session Context for Next Conversation

> This file is for Claude to read at the start of the next session to get up to speed instantly.
> Last updated: 2026-05-07 (Day 3 session end)

---

## What This Project Is

**LifeOS** — a personal gamified life-management app built with Next.js 15 (App Router), Supabase, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Gemini AI.

- Working dir: `c:\Users\niles\LifeOS`
- Stack: Next.js, Supabase (auth + DB + realtime), Tailwind, shadcn/ui, date-fns, lucide-react, framer-motion, canvas-confetti, sonner (toasts), Gemini API
- `database.types.ts` is **UTF-16 LE encoded** — do NOT use Read tool to edit it; use Node.js scripts with `'utf16le'` encoding
- All server actions use `"use server"` and `createClient` from `@/lib/supabase/server`
- All client data fetching uses `createClient` from `@/lib/supabase/client`
- XP events use `window.dispatchEvent(new CustomEvent("xp_updated"))` to sync UI

---

## Current Dashboard Tabs (sidebar nav in `src/app/dashboard/page.tsx`)

| Tab key | Label | Components rendered |
|---|---|---|
| `dashboard` | Dashboard | QuestBoard, DailyTasks, IndulgenceShop |
| `habits` | Habit Grid | HabitGrid |
| `planner` | Planner | PersonalPlanner, TaskTable, AcademicTracker |
| `history` | History & Journal | HistoryCalendar |
| `journal` | Journal & Oracle | JournalEditor, OracleChat |
| `settings` | Settings | PIN change, Onboarding reset |

---

## Database Tables (all in Supabase, all with RLS)

### Existing (pre Day 3)
- **profiles** — `id, username, total_xp, level, daily_streak, last_login, deep_mode_active, ai_custom_instructions`
- **quests** — `id, profile_id, name, description, xp_reward, frequency, is_active, last_completed_at`
- **xp_transactions** — `id, profile_id, amount, reason, category, created_at`
- **daily_tasks** — `id, user_id, name, description, xp_reward, task_date, is_completed, is_assigned_by_ai`
- **indulgences** — `id, user_id, name, xp_cost, category`
- **journal_entries** — `id, profile_id, content, date, mood_score, is_encrypted`
- **level_logs** — `id, profile_id, level_reached`
- **ai_chat_history** — `id, profile_id, message, role`

### New (Day 3 — run `supabase/migrations/02_phase3_planner.sql`)
- **tasks** — `id, profile_id, title, description, deadline (timestamptz), priority (low/medium/high/urgent), is_completed, is_assigned_by_ai, category`
- **academic_subjects** — `id, profile_id, name, target_percentage`
- **attendance_records** — `id, subject_id, profile_id, date, status (present/absent/late)`

---

## Key Architecture Decisions Made

### XP Economy
- `grantXP(amount, reason)` in `xpService.ts` — inserts transaction, updates `profiles.total_xp`, checks level-up, logs to `level_logs`
- `spendXP(userId, amount, itemName)` in `habitService.ts` — checks balance server-side, inserts negative transaction, deducts from profile
- Level formula: `floor(sqrt(total_xp / 100)) + 1`

### Habit Completion (`completeHabit` in `habitService.ts`)
- Guards same-day double completion via `xp_transactions` lookup
- Streak bonus: +25% XP at 3d, +50% at 7d, +100% at 30d
- Streak calculated from transaction history (consecutive days prior to today)

### Habit Level (in `HabitGrid.tsx`)
- `habitLevel(n) = floor(sqrt(n / 2)) + 1`
- Tiers: Novice (1), Apprentice (2), Adept (3), Expert (4), Master (5+)
- Progress bar color changes by tier (slate→amber→silver→gold→cyan)

### Urgency Score (in `TaskTable.tsx`)
- `urgency = priority_weight * 25 + deadline_proximity`
- Priority weights: urgent=4, high=3, medium=2, low=1
- Deadline proximity: overdue=120, <24h=100, <3d=75, <7d=50, <14d=25, else=10
- Score color: red≥200, orange≥150, yellow≥100

### Academic Tracker Attendance
- `percentage = (present + late) / total * 100` (late counts as attended)
- Color: green if ≥ target, yellow if within 5%, red if below target
- One record per subject per day (upsert pattern in `logAttendance`)

### HistoryCalendar
- Sources: `xp_transactions` (activity) + `journal_entries` (notes)
- Calendar dot legend: green=activity, yellow=selected task highlight, blue dot=journal note
- Clicking activity in day panel highlights all days that activity was done (cross-references task panel)
- Journal note: inline textarea to add a note for any day; reads existing notes for past days

---

## Files Added This Session

### Day 2
- `src/components/dashboard/HabitGrid.tsx`
- `src/components/dashboard/HistoryCalendar.tsx` (full rewrite)
- `src/components/dashboard/IndulgenceShop.tsx` (full rewrite)
- `src/services/habitService.ts` (completeHabit + spendXP)

### Day 3
- `src/components/planner/PersonalPlanner.tsx`
- `src/components/planner/TaskTable.tsx`
- `src/components/planner/AcademicTracker.tsx`
- `src/components/ui/table.tsx`
- `src/services/planner/taskService.ts`
- `src/services/planner/academicService.ts`
- `supabase/migrations/02_phase3_planner.sql`

---

## Important Notes for Next Session

1. **Run the SQL migration** — `supabase/migrations/02_phase3_planner.sql` must be applied in Supabase Dashboard → SQL Editor before the Planner tab will work.

2. **database.types.ts encoding** — This file is UTF-16 LE. If you ever need to edit it programmatically, use Node.js:
   ```js
   const fs = require('fs');
   let raw = fs.readFileSync('src/types/database.types.ts', 'utf16le');
   // ... modify raw ...
   fs.writeFileSync('src/types/database.types.ts', raw, 'utf16le');
   ```
   Never use the Read/Write tools for this file — they won't handle encoding correctly.

3. **Type-check often** — Run `npx tsc --noEmit` after changes. The project has strict types.

4. **XP event bus** — After any server action that changes XP, fire `window.dispatchEvent(new CustomEvent("xp_updated"))` to trigger UI refresh in `useRealtimeXP` and all components listening.

5. **`daily_tasks` vs `tasks`** — There are TWO task tables. `daily_tasks` is the old AI-assigned daily task system (DailyTasks.tsx). The new `tasks` table is for user-created tasks with deadlines and priorities (PersonalPlanner + TaskTable).

---

## What's NOT Done Yet (likely Phase 4+)

- Memory Lane / Media Upload gallery
- Health & Fitness Log
- Comfort Zone Breaker (random daily challenge generator)
- AI-assigned tasks (`is_assigned_by_ai` flag on both `tasks` and `daily_tasks` is plumbed but Oracle doesn't create tasks yet)
- Mobile/responsive layout polish
- Notifications / reminders

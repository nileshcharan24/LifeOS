# LifeOS Progress

### Phase 0: Setup & Infrastructure
- [x] 0.2. Next.js Project Initialization
- [x] 0.3. Project Structure Refinement & Core Files

### Phase 1: Data & Security
- [x] 1.1. Supabase Project Setup & Database Schema
- [x] 1.2. User Authentication (Email/Password) & Protected Routes
- [x] 1.3. Privacy & Dual-State (Normal/Deep Mode)
- [x] 1.4. Client-Side Encryption Logic (for Deep Mode) using Web Crypto API

### Phase 2: Core Features (Done previously)
- [x] A. The Economy (XP & Scoring) & REALTIME VERIFIED
- [x] B. Planning & Productivity (Quest Board, CreateQuestModal, QuestCard, completeQuest)
- [x] C. Reflection & Health (Journal encrypted, Mood Tracker)
- [x] D. The AI Oracle (Your Companion) - Gemini API Integrations
- [x] E. Economy V2 (Daily Streaks, Level History Logs)

### Phase 2 Extension: Gamified Features (Session — Day 2)
- [x] History & Journal Calendar (HistoryCalendar.tsx — calendar view of XP transactions + journal notes by day)
- [x] Habit Grid (HabitGrid.tsx — gamified quest grid with level badges, XP progress bars, streak counter)
- [x] Habit Server Action (habitService.ts — completeHabit with streak bonus XP: +25%@3d, +50%@7d, +100%@30d)
- [x] Indulgence Shop V2 (IndulgenceShop.tsx — full buy UI, live XP balance, affordability lock, Add Item form)
- [x] spendXP Server Action (habitService.ts — deducts XP from profile, logs negative transaction)

### Phase 3: Planning & Academic Tracker (Session — Day 3)
- [x] 3.1. Personal Planner UI (PersonalPlanner.tsx — 14-day horizontal scroll calendar, task cards by priority, Add Task dialog with deadline/priority/category)
- [x] 3.2. `tasks` table (deadline, priority, is_completed, is_assigned_by_ai, category) — migration: 02_phase3_planner.sql
- [x] 3.3. `academic_subjects` table (name, target_percentage) — same migration
- [x] 3.4. `attendance_records` table (subject_id, date, status: present/absent/late) — same migration
- [x] 3.5. Academic Tracker UI (AcademicTracker.tsx — attendance % bars, present/absent/late buttons, target color coding)
- [x] 3.6. Academic Service (academicService.ts — createSubject, logAttendance with upsert-per-day, deleteSubject)
- [x] 3.7. Task Service (taskService.ts — createTask, toggleTask, deleteTask server actions)
- [x] 3.8. Task Table with Sort by Urgency (TaskTable.tsx — shadcn Table, urgency score = priority×25 + deadline proximity, color-coded scores)
- [x] 3.9. shadcn Table component added (src/components/ui/table.tsx)
- [x] 3.10. "Planner" tab added to dashboard sidebar (PersonalPlanner + TaskTable + AcademicTracker)

### Dashboard Navigation (current tabs)
- Dashboard (QuestBoard, DailyTasks, IndulgenceShop)
- Habit Grid (HabitGrid)
- Planner (PersonalPlanner, TaskTable, AcademicTracker)
- History & Journal (HistoryCalendar)
- Journal & Oracle (JournalEditor, OracleChat)
- Settings (PIN management, Onboarding reset)

### Database Tables (all with RLS)
- profiles, quests, xp_transactions, daily_tasks, indulgences (Phase 1–2)
- journal_entries, level_logs, ai_chat_history (Phase C/D/E)
- tasks, academic_subjects, attendance_records (Phase 3 — run 02_phase3_planner.sql)

### Pending / Not Yet Started
- [ ] Phase 4+ features (TBD by user tomorrow)

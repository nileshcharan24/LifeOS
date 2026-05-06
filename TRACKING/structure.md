## src/ Directory Structure (Feature-Based Architecture)

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── actions.ts
│   ├── auth/
│   │   └── confirm/page.tsx
│   ├── dashboard/
│   │   └── page.tsx          ← main shell: sidebar nav + tab switching
│   ├── actions.ts             ← grantXPServerAction
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── dashboard/
│   │   ├── DailyTasks.tsx
│   │   ├── HabitGrid.tsx      ← NEW (Day 2): gamified habit grid
│   │   ├── HistoryCalendar.tsx← NEW (Day 2): calendar + journal note per day
│   │   ├── IndulgenceShop.tsx ← UPDATED (Day 2): full buy/add UI
│   │   ├── QuestBoard.tsx
│   │   └── XPProgress.tsx
│   ├── economy/
│   │   └── XPDisplay.tsx      ← level badge, XP bar, level-up dialog
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── OnboardingTour.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ModeToggle.tsx
│   │   └── ThemeToggle.tsx
│   ├── planner/               ← NEW (Day 3)
│   │   ├── PersonalPlanner.tsx  ← horizontal scroll calendar + task cards
│   │   ├── TaskTable.tsx        ← sort-by-urgency table
│   │   └── AcademicTracker.tsx  ← attendance % tracker
│   ├── productivity/
│   │   ├── CreateQuestModal.tsx
│   │   └── QuestCard.tsx
│   └── ui/
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── progress.tsx
│       ├── select.tsx
│       ├── table.tsx          ← NEW (Day 3): shadcn Table component
│       └── alert.tsx
├── context/
│   ├── AuthContext.tsx
│   └── ModeContext.tsx
├── features/
│   ├── ai/OracleChat.tsx
│   └── journal/JournalEditor.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useLocalStorage.ts
│   ├── useMode.ts
│   ├── usePoints.ts
│   └── useRealtimeXP.ts      ← listens to profile realtime + xp_updated events
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── utils/
│       └── encryption.ts     ← AES-GCM Web Crypto API
├── services/
│   ├── ai/aiService.ts        ← Gemini API, askOracle
│   ├── auth/authService.ts
│   ├── economy/xpService.ts   ← grantXP, calculateLevel, updateDailyStreak
│   ├── habitService.ts        ← NEW (Day 2): completeHabit (streak bonus), spendXP
│   ├── journal/journalService.ts
│   ├── planner/               ← NEW (Day 3)
│   │   ├── taskService.ts     ← createTask, toggleTask, deleteTask
│   │   └── academicService.ts ← createSubject, logAttendance (upsert), deleteSubject
│   └── productivity/questService.ts
├── types/
│   ├── auth.ts
│   ├── database.types.ts      ← UPDATED (Day 3): + tasks, academic_subjects, attendance_records
│   └── index.ts
└── supabase/
    └── migrations/
        ├── 01_phase_c_d_e.sql
        └── 02_phase3_planner.sql  ← NEW (Day 3): tasks + academic tables
```

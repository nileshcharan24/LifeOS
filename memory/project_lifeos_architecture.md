---
name: LifeOS Architecture & Key Decisions
description: Core tech stack, component structure, data patterns, and major design decisions for the LifeOS project
type: project
---

Next.js 16 (App Router), Supabase (Postgres + Realtime + Auth), Tailwind CSS v4, shadcn/ui, Lucide icons, date-fns, Framer Motion.

**Key patterns:**
- Dashboard is a single page at `/dashboard` with tab-based lazy-mount pattern (tabs go hidden, not unmounted)
- Server actions ("use server") in `/src/services/**` are called directly from client components
- XP system: 1000 XP/level, spending pool above floor, useRealtimeXP hook for live updates
- Supabase column naming: habits/habit_instances/negative_habits/journal_entries use `profile_id`; daily_tasks uses `user_id`

**Major redesign done (May 2026):**
- New `Sidebar.tsx` — collapsible sidebar (w-16 collapsed, w-64 expanded), localStorage persistence, tooltips on hover, 15 nav items in new order with Profile as new tab
- New `DashboardHub.tsx` — replaces QuestBoard/DailyTasks/IndulgenceShop with 6-section hub (Habits+Tasks, Negative Habits, Upcoming Deadlines, Journal Today, Health Snapshot, XP Level)
- New `ProfilePage.tsx` in `/src/components/profile/` — user info, XP bars, milestones grid, IndulgenceShop, quick links
- `dashboard/page.tsx` refactored to use Sidebar component, added profile tab, removed QuestBoard/Quests

**Why:** Per user spec for better accessibility, information hierarchy, collapsible nav, consolidated dashboard.

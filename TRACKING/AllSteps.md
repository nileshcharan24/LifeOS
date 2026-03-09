# LifeOS: The Gamified Personal Growth Engine
## Master Project Roadmap & Feature Specification

### 1. Vision & Core Philosophy
**LifeOS** is a high-performance "Second Brain" and digital accountability partner for a 21-year-old engineering student. It bridges industrial-grade engineering (Instrumentation & Control) with cutting-edge AI (RL & LLMs).

*   **Gamification:** Life is a series of quests. Habits = XP. XP = Permission to indulge (e.g., social media time, snacks, spending).
*   **Dual-State Privacy:** The app operates in two modes:
    *   **Normal Mode:** Public / casual use, showing aggregated or non-sensitive data.
    *   **Deep Mode:** Sensitive tracking (sobriety, mental health, private journals). Data in this mode must be hidden, redacted, or aggregated in Normal Mode. Logs, analytics, and error messages must *never* leak Deep Mode details.
*   **AI Oracle:** An in-app AI guide that is constructive, firm, and analytical. It uses RAG to analyze journals, health data, and habit scores. Its tone and behavior are modifiable but should generally be firm but constructive, providing specific positive reinforcement and actionable next steps.
*   **Holistic Tracking:** Academic attendance, fitness, and "Comfort Zone" challenges.
*   **Vibe Coding:** The user wants to build fast with AI agents while understanding the underlying "why."

---

### 2. Technology Stack
*   **Framework:** Next.js 15 (App Router) + TypeScript.
*   **Styling:** Tailwind CSS + ShadcnUI (Modern, clean, dashboard-centric).
*   **Backend:** Supabase (Auth, Postgres DB, Edge Functions, Storage).
*   **AI Engine (Cloud):** OpenRouter (Claude 3.5 Sonnet for logic, Gemini 1.5 Flash for summaries).
*   **Local AI (Optional/Future):** Ollama + Qdrant (for local indexing and private AI analysis).

---

### 3. Application Architecture - Modular Monorepo

Our current refactored structure already sets us up for this.

```text
LifeOS/
├── src/
│   ├── app/                # Next.js App Router (Routes, Layouts, Pages, API Endpoints)
│   ├── components/         # Shared components (layout-specific, non-domain)
│   │   ├── layout/         # Navigation, Headers, Footers
│   │   └── ui/             # ShadcnUI primitives, generic UI elements
│   ├── context/            # Global state context (e.g., ModeContext)
│   ├── features/           # Domain-specific logic, components, and hooks
│   │   ├── ai/             # AI-related UI components (Oracle Chat, Summaries)
│   │   ├── dashboard/      # Main dashboard sections (Quest Board, XP Progress)
│   │   ├── forms/          # Reusable forms for data input (HealthLog, ReflectionForm)
│   │   ├── gamification/   # Logic/components for XP, indulgences, quests
│   │   ├── health/         # Food, workout, sobriety trackers
│   │   ├── memory/         # Image/video uploads for Memory Lane
│   │   └── planner/        # Calendar, daily tasks, weekly/monthly planning
│   ├── hooks/              # Reusable React hooks (e.g., useAuth, useMode)
│   ├── lib/                # Shared utilities, external service integrations, ML models
│   │   ├── ml/             # Local ML model configurations, embedding utilities
│   │   ├── supabase/       # Supabase client initialization, specific utilities
│   │   └── utils/          # General utility functions
│   ├── schemas/            # Zod schemas for validation
│   ├── services/           # Backend interaction logic (API calls, data manipulation)
│   │   ├── ai/             # AI orchestration logic (prompting, RAG integration)
│   │   ├── auth/           # Authentication-related services
│   │   ├── database/       # Generic database CRUD operations
│   │   └── gamification/   # XP calculation, quest management
│   ├── store/              # Zustand/Context for global client-side state
│   ├── types/              # TypeScript type definitions (e.g., database.types.ts)
│   └── styles/             # Global CSS, Tailwind config extensions (if needed)
├── TRACKING/               # Project meta-documentation
│   ├── AllSteps.md         # This detailed roadmap
│   ├── errors.md           # Error log / resolutions
│   ├── goals.md            # Project goals & features
│   ├── MEMEX.md            # Instructions for the AI
│   └── progress.md         # Current progress status
├── public/                 # Static assets
├── .clinerules             # AI instruction files
├── .cursorrules            # AI instruction files
└── ...                     # Other config files (package.json, tsconfig.json, etc.)
```

**Key Architectural Decisions:**

*   **Server Components/Actions:** Maximize server-side rendering and data fetching with Next.js Server Components and Server Actions for performance, security, and reduced client-side bundle size.
*   **Modular Features:** Each domain (`gamification`, `health`, `planner`, etc.) gets its own `features/` subdirectory, encapsulating its components, hooks, and potentially even local data fetching logic.
*   **Centralized Services:** `services/` contains all interactions with external APIs (Supabase, OpenRouter) and complex business logic, making them reusable and testable.
*   **Clear State Management:** `context/` for global state (like `ModeContext`), `store/` for more complex client-side state (e.g., Zustand), and hooks in `features/` or `hooks/` for local component state.
*   **Strict Validation:** `schemas/` with Zod for all input validation (forms, API payloads).
*   **Environment Variables:** All secrets and API keys are strictly loaded from environment variables (`.env.local`).
*   **Privacy by Design:** `ModeContext` is central to controlling data visibility and access in Normal/Deep modes. Server-side checks will enforce privacy.

---

### 4. Detailed Feature Breakdown & Implementation Strategy

#### A. The Economy (XP & Scoring)

*   **Quest Board (Main Quests):**
    *   **DB Schema:** `quests` table (`id`, `user_id`, `name`, `description`, `xp_reward`, `frequency` (daily, weekly), `last_completed_at`, `is_active`).
    *   **Service:** `services/gamification/questService.ts` for CRUD operations on quests.
    *   **Feature:** `features/gamification/QuestBoard.tsx` to display quests, mark as complete, and award XP.
*   **Variable Rewards:**
    *   **Logic:** `xp_reward` field in `quests` table. XP calculation in `services/gamification/xpEngine.ts`.
*   **Indulgence Shop:**
    *   **DB Schema:** `indulgences` table (`id`, `user_id`, `name`, `xp_cost`, `type` (time, item, etc.), `duration_minutes` (for screen time)). `user_indulgences` table (`user_id`, `indulgence_id`, `purchased_at`).
    *   **Service:** `services/gamification/indulgenceService.ts` for purchasing/redeeming indulgences.
    *   **Feature:** `features/gamification/IndulgenceShop.tsx` to display available indulgences and allow purchasing.
*   **Daily Side-Quests:**
    *   **DB Schema:** `daily_tasks` table (`id`, `user_id`, `name`, `description`, `xp_reward`, `date`, `is_completed`).
    *   **Service:** `services/gamification/dailyTaskService.ts`.
    *   **Feature:** Integrate into `features/planner/DailyPlanner.tsx`.
*   **Comfort Zone Breaker:**
    *   **DB Schema:** `comfort_zone_tasks` table (`id`, `task_description`, `bonus_xp`).
    *   **Service:** `services/gamification/comfortZoneService.ts` to fetch a random task.
    *   **Feature:** `features/gamification/ComfortZoneCard.tsx` (display on dashboard).

#### B. Planning & Productivity

*   **Universal Planner (Visual Calendar):**
    *   **UI Component:** `src/components/ui/Calendar.tsx` (using `react-day-picker`).
    *   **Feature:** `features/planner/CalendarView.tsx` to integrate the calendar and display tasks/deadlines.
    *   **DB Schema:** `events` table (`id`, `user_id`, `title`, `description`, `start_date`, `end_date`, `type` (task, deadline, chore)).
*   **Academic Tracker:**
    *   **DB Schema:** `courses` table (`id`, `user_id`, `name`, `instructor`). `assignments` table (`id`, `course_id`, `name`, `due_date`, `is_completed`). `attendance` table (`id`, `course_id`, `date`, `is_present`).
    *   **Service:** `services/academicService.ts`.
    *   **Feature:** `features/academic/AcademicDashboard.tsx`.
*   **No-Deadline Task Pool:**
    *   **DB Schema:** `backlog_tasks` table (`id`, `user_id`, `name`, `description`).
    *   **Service:** `services/planner/backlogService.ts`.
    *   **Feature:** `features/planner/BacklogList.tsx`.
*   **AI Auto-Scheduler:**
    *   **Service:** `services/ai/autoScheduler.ts`. This will take user's schedule, available free time, and `backlog_tasks` to suggest/allot tasks.
    *   **AI Integration:** Use OpenRouter (Claude/Gemini) with function calling to parse schedules and assign tasks.

#### C. Reflection & Health

*   **The Digital Diary:**
    *   **DB Schema:** `journal_entries` table (`id`, `user_id`, `date`, `content`, `is_deep_mode`).
    *   **Feature:** `features/journal/JournalEditor.tsx` (Rich Text editor, e.g., using `react-quill` or `tiptap`).
    *   **Privacy:** `is_deep_mode` flag, enforced by `ModeContext`.
*   **Positive/Negative Loop:**
    *   **DB Schema:** `daily_reflections` table (`id`, `user_id`, `date`, `positives`, `negatives`, `improvements`).
    *   **Feature:** `features/journal/ReflectionForm.tsx`.
*   **Health Suite:**
    *   **DB Schema:**
        *   `food_logs` (`id`, `user_id`, `date`, `meal_type`, `food_item`, `calories`, `protein`, `carbs`, `fat`).
        *   `workout_logs` (`id`, `user_id`, `date`, `workout_type`, `duration_minutes`, `calories_burned`).
        *   `sobriety_streaks` (`id`, `user_id`, `start_date`, `end_date` (nullable)).
    *   **Service:** `services/healthService.ts`.
    *   **Feature:** `features/health/HealthDashboard.tsx`, `features/health/FoodLogForm.tsx`, `features/health/WorkoutLogForm.tsx`.
*   **Memory Lane:**
    *   **DB Schema:** `media_uploads` table (`id`, `user_id`, `date`, `url`, `description`, `type` (image/video)).
    *   **Supabase Storage:** Store actual image/video files.
    *   **Service:** `services/storageService.ts` for upload/delete.
    *   **Feature:** `features/memory/MemoryLaneGallery.tsx` and `features/memory/UploadButton.tsx`.

#### D. The AI Oracle (Your Companion)

*   **Chat Interface:**
    *   **Feature:** `features/ai/OracleChat.tsx` for real-time interaction.
    *   **DB Schema:** `ai_chat_history` table (`id`, `user_id`, `timestamp`, `speaker` (user/oracle), `message`).
*   **Tone Control:**
    *   **UI:** `src/components/layout/OracleToneSlider.tsx` (part of settings).
    *   **Logic:** Pass `tone_setting` to AI prompts.
*   **Full-Context Access (Deep Mode Integration):**
    *   **Logic:** `services/ai/orchestrator.ts` retrieves relevant user data (habits, scores, journal, reflections, health) based on `ModeContext` and user permission, then formats it into the AI prompt.
    *   **RAG Pipeline (Local Ollama/Qdrant):** If implemented, `src/lib/ml` handles embedding generation and Qdrant queries to fetch relevant document chunks (e.g., journal entries, reflection logs) for context.
*   **End-of-Day Review:**
    *   **Supabase Edge Function / Cron Job:** Triggered nightly.
    *   **Service:** `services/ai/dailySummaryService.ts` that calls the AI with aggregated daily data.
    *   **DB Schema:** `daily_summaries` table (`id`, `user_id`, `date`, `summary_content`).
    *   **Feature:** `features/ai/DailySummary.tsx`.
*   **Mood-Based Entertainment:**
    *   **DB Schema:** `entertainment_options` (`id`, `name`, `category`, `mood_tags`).
    *   **UI:** User inputs mood.
    *   **Logic:** `services/ai/entertainmentService.ts` uses AI to match user mood with `mood_tags` from `entertainment_options`.

---

### 5. Detailed Step-by-Step Build Guide

This guide is designed for a beginner, breaking down each phase and feature into granular, actionable steps. "AI Help" indicates where you can leverage AI tools (like me) for assistance.

#### Phase 0: Setup & Infrastructure (Days 1-2)

This phase focuses on getting your development environment ready and setting up the basic project structure.

**0.1. Local Development Environment Setup (Windows + WSL2 Recommended)**

*   **0.1.1. Install Visual Studio Code (if not already installed):**
    *   **Action:** Download and run the installer from [`code.visualstudio.com`](https://code.visualstudio.com/).
    *   **AI Help:** "How to install VS Code on Windows 11?"
*   **0.1.2. Install Node.js & npm (or Yarn/pnpm):**
    *   **Action:** Download the recommended LTS version from [`nodejs.org`](https://nodejs.org/) and run the installer. This will install both Node.js and npm.
    *   **Verification:** Open your terminal (Command Prompt or PowerShell) and run `node -v` and `npm -v`.
    *   **AI Help:** "What is Node.js and npm?"
*   **0.1.3. Set up Windows Subsystem for Linux 2 (WSL2) with Ubuntu (Optional but Recommended for Local AI):**
    *   **Action:** Follow Microsoft's official guide to install WSL2 and then install Ubuntu from the Microsoft Store.
    *   **Verification:** Open PowerShell as Administrator and run `wsl --install -d Ubuntu`. After installation, open the "Ubuntu" app from your Start Menu to complete setup (create username/password).
    *   **AI Help:** "How to install WSL2 and Ubuntu on Windows 11?"
*   **0.1.4. Install Docker Desktop (for WSL2 integration & local AI):**
    *   **Action:** Download and install Docker Desktop from [`docs.docker.com/desktop/install/windows-install/`](https://docs.docker.com/desktop/install/windows-install/). Ensure WSL2 integration is enabled in Docker Desktop settings.
    *   **Verification:** Open Docker Desktop, then in your WSL2 Ubuntu terminal, run `docker run hello-world`.
    *   **AI Help:** "How to set up Docker Desktop with WSL2?"
*   **0.1.5. Configure Git:**
    *   **Action:** Git should be installed with VS Code or Node.js. In your terminal, configure your global Git username and email:
        ```bash
        git config --global user.name "Your Name"
        git config --global user.email "your.email@example.com"
        ```
    *   **AI Help:** "Basic Git commands for beginners."
*   **0.1.6. OpenRouter API Key Setup:**
    *   **Action:** Create an account on [`openrouter.ai`](https://openrouter.ai/) and generate an API key. **Store this key securely.**
    *   **AI Help:** "Best practices for storing API keys in development."

**0.2. Next.js Project Initialization**

*   **0.2.1. Create a new Next.js project:**
    *   **Action:** In your terminal (Windows Command Prompt/PowerShell or WSL2 Ubuntu), navigate to your desired projects folder and run:
        ```bash
        npx create-next-app@latest lifeos-app --typescript --tailwind --eslint --app
        # When prompted for ESLint, Tailwind CSS, src directory, App Router, and import alias, choose 'Yes' or 'Default'
        ```
    *   **Explanation:**
        *   `npx create-next-app@latest`: Uses the latest Next.js installer.
        *   `lifeos-app`: Your project folder name.
        *   `--typescript`: Initializes with TypeScript.
        *   `--tailwind`: Configures Tailwind CSS.
        *   `--eslint`: Sets up ESLint for code linting.
        *   `--app`: Uses the new App Router.
    *   **AI Help:** "Getting started with Next.js App Router."
*   **0.2.2. Navigate into your project and start the development server:**
    *   **Action:**
        ```bash
        cd lifeos-app
        npm run dev
        ```
    *   **Verification:** Open your browser to `http://localhost:3000`. You should see the default Next.js starter page.
*   **0.2.3. Initialize Git in your project:**
    *   **Action:** If you followed the previous task, this should be done. If not, in `lifeos-app` directory:
        ```bash
        git init
        ```
    *   **AI Help:** "Git lifecycle: init, add, commit, push."
*   **0.2.4. Create a comprehensive `.gitignore` file (if not already done by `create-next-app` or manually):**
    *   **Action:** Ensure your `.gitignore` includes at least: `node_modules/`, `.next/`, `.env.local`, `*.log`, `coverage/`, `dist/`, `out/`, `*.db`, `*.sqlite`, `*.dump`, `*.sql`.
    *   **AI Help:** "Standard .gitignore for Next.js projects."
*   **0.2.5. Make initial commit and link to GitHub (if you skipped this in the previous task):**
    *   **Action:**
        ```bash
        git add .
        git commit -m "feat: initial Next.js project setup"
        # Assuming you have a remote repo already created on GitHub
        git remote add origin YOUR_GITHUB_REPO_URL
        git branch -M main # or master
        git push -u origin main # or master
        ```
    *   **AI Help:** "How to push a local Git repository to GitHub."

**0.3. Project Structure Refinement & Core Files**

*   **0.3.1. Verify/Create the `src/` directory:**
    *   **Action:** Your `create-next-app` command should have already created a `src/` directory. If not, create it and move `app/`, `public/`, `styles/` (if it exists) into it.
    *   **AI Help:** "Next.js src directory convention."
*   **0.3.2. Implement the Modular Monorepo Structure (as previously defined):**
    *   **Action:** Create the following empty directories within `src/` if they don't exist, using your terminal:
        ```bash
        # In the root of your project:
        mkdir -p src/components/ui src/context src/features src/features/ai src/features/dashboard src/features/forms src/features/gamification src/features/health src/features/memory src/features/planner src/lib/ml src/lib/supabase src/lib/utils src/schemas src/services src/services/ai src/services/auth src/services/database src/services/gamification src/store src/types src/styles
        ```
    *   **Explanation:** This command creates all necessary subdirectories. The `-p` flag ensures parent directories are created if they don't exist.
    *   **AI Help:** "Modular architecture best practices in React/Next.js."
*   **0.3.3. Create `src/context/ModeContext.tsx`:**
    *   **Action:** Create this file with the provided content (from our previous task). This context will manage your Normal/Deep Mode toggle.
    *   **AI Help:** "How to create a React Context API."
*   **0.3.4. Create `src/types/database.types.ts` and `src/types/index.ts`:**
    *   **Action:** Create these empty files. They will be populated later with Supabase types and general app types.
*   **0.3.5. Create `TRACKING/` Directory and Files (Manual Recreation):**
    *   **Action:**
        ```bash
        mkdir TRACKING
        ```
        Then use `write_to_file` to create each of the `TRACKING` markdown files: `goals.md`, `progress.md`, `structure.md`, `errors.md`, and `MEMEX.md`. (The content for `goals.md`, `progress.md`, `structure.md`, `errors.md` is provided in your prompt. For `MEMEX.md`, you can use the content we read earlier: "## LifeOS MEMEX Instructions\n- When asked to \"Sync Memex\", update the markdown files in the `TRACKING` folder: `progress.md`, `goals.md`, `structure.md`, `MEMEX.md`.\n- Do **not** use `TRACKING` files as active runtime context for application logic unless explicitly requested.\n- Treat `TRACKING` as a **meta layer** for planning, reflection, and project oversight rather than live configuration.").
    *   **Verification:** Run `ls -R TRACKING` (on WSL2) or `dir /s TRACKING` (on Windows Command Prompt) to confirm all files exist.

#### Phase 1: Data & Security (Days 2-3)

This phase focuses on setting up your database (Supabase) and authentication.

**1.1. Supabase Project Setup & Database Schema**

*   **1.1.1. Create a Supabase Project:**
    *   **Action:** Go to [`supabase.com`](https://supabase.com/), sign up/log in, and create a new project. Choose a region close to you.
    *   **AI Help:** "Supabase getting started guide."
*   **1.1.2. Define Initial SQL Schema (Using Supabase SQL Editor):**
    *   **Action:** In your Supabase project dashboard, navigate to the "SQL Editor." Create the following tables. We'll start with essential tables and add more as needed.
        *   **`profiles` table:** Stores user metadata.
            ```sql
            create table public.profiles (
              id uuid references auth.users not null primary key,
              username text unique,
              avatar_url text,
              full_name text,
              deep_mode boolean default false, -- New: Tracks user's deep mode preference
              updated_at timestamp with time zone default now()
            );
            alter table public.profiles enable row security;
            create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
            create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
            create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);
            ```
        *   **`quests` table (Main Habits):**
            ```sql
            create table public.quests (
              id uuid default gen_random_uuid() primary key,
              user_id uuid references public.profiles(id) on delete cascade not null,
              name text not null,
              description text,
              xp_reward integer not null default 10,
              frequency text not null default 'daily', -- 'daily', 'weekly', 'monthly'
              last_completed_at timestamp with time zone,
              is_active boolean default true,
              created_at timestamp with time zone default now()
            );
            alter table public.quests enable row security;
            create policy "User can view their own quests." on public.quests for select using (auth.uid() = user_id);
            create policy "User can insert their own quests." on public.quests for insert with check (auth.uid() = user_id);
            create policy "User can update their own quests." on public.quests for update using (auth.uid() = user_id);
            create policy "User can delete their own quests." on public.quests for delete using (auth.uid() = user_id);
            ```
        *   **`daily_tasks` table (Side-Quests/Daily To-Do):**
            ```sql
            create table public.daily_tasks (
              id uuid default gen_random_uuid() primary key,
              user_id uuid references public.profiles(id) on delete cascade not null,
              name text not null,
              description text,
              xp_reward integer default 5,
              task_date date not null,
              is_completed boolean default false,
              created_at timestamp with time zone default now()
            );
            alter table public.daily_tasks enable row security;
            create policy "User can view their own daily tasks." on public.daily_tasks for select using (auth.uid() = user_id);
            create policy "User can insert their own daily tasks." on public.daily_tasks for insert with check (auth.uid() = user_id);
            create policy "User can update their own daily tasks." on public.daily_tasks for update using (auth.uid() = user_id);
            create policy "User can delete their own daily tasks." on public.daily_tasks for delete using (auth.uid() = user_id);
            ```
    *   **AI Help:** "How to design a database schema for a habit tracker."
*   **1.1.3. Configure Supabase Environment Variables in Next.js:**
    *   **Action:** In your `lifeos-app` project, create a file named `.env.local` at the root. Add your Supabase project URL and Anon Key (found in Supabase project settings -> API).
        ```env
        NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
        NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
        ```
    *   **Explanation:** `NEXT_PUBLIC_` prefix makes these available on the client-side.
    *   **AI Help:** "Using environment variables in Next.js."
*   **1.1.4. Generate TypeScript Types from Supabase (Crucial for Type Safety):**
    *   **Action:** Install the Supabase CLI globally: `npm install -g supabase`.
    *   **Action:** Link your project: `supabase login` (follow prompts). Then `supabase link --project-ref YOUR_PROJECT_REF` (Project Ref is found in Supabase settings -> General -> Project ID).
    *   **Action:** Generate types to `src/types/database.types.ts`:
        ```bash
        supabase gen types typescript --schema public > src/types/database.types.ts
        ```
    *   **AI Help:** "Supabase CLI generate types for TypeScript."
*   **1.1.5. Initialize Supabase Client in `src/lib/supabase/client.ts`:**
    *   **Action:** Create `src/lib/supabase/client.ts` with:
        ```typescript
        import { createBrowserClient } from '@supabase/ssr';
        import { Database } from '@/types/database.types'; // Your generated types

        export const supabase = createBrowserClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        ```
    *   **AI Help:** "Supabase client setup in Next.js."

**1.2. User Authentication (Email/Password) & Protected Routes**

*   **1.2.1. Implement Sign-Up and Login Pages:**
    *   **Feature:** `src/features/auth/AuthForms.tsx`.
    *   **Actions:**
        *   Create `src/app/(auth)/login/page.tsx` and `src/app/(auth)/signup/page.tsx` to host authentication forms.
        *   Use Supabase client (`src/lib/supabase/client.ts`) for `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`.
        *   Implement basic form handling (e.g., using `react-hook-form` and Zod validation in `src/schemas/auth.ts`).
    *   **AI Help:** "Building authentication forms with Supabase and Next.js."
*   **1.2.2. Create an Authentication Service (`src/services/auth/authService.ts`):**
    *   **Action:** Encapsulate Supabase auth calls here.
        ```typescript
        import { supabase } from '@/lib/supabase/client';

        export const signUp = async (email: string, password: string) => {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;
          return data;
        };

        export const signIn = async (email: string, password: string) => {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          return data;
        };

        export const signOut = async () => {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        };
        ```
*   **1.2.3. Implement `useAuth` Hook (`src/hooks/useAuth.ts`):**
    *   **Action:** Create a React hook to manage user session and loading state.
        ```typescript
        import { useState, useEffect } from 'react';
        import { supabase } from '@/lib/supabase/client';
        import { User } from '@supabase/supabase-js';

        export const useAuth = () => {
          const [user, setUser] = useState<User | null>(null);
          const [loading, setLoading] = useState(true);

          useEffect(() => {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
              setUser(session?.user || null);
              setLoading(false);
            });

            supabase.auth.getSession().then(({ data: { session } }) => {
              setUser(session?.user || null);
              setLoading(false);
            });

            return () => subscription.unsubscribe();
          }, []);

          return { user, loading };
        };
        ```
*   **1.2.4. Create Protected Routes (`src/app/(app)/layout.tsx` and middleware):**
    *   **Action:**
        *   Create a `src/middleware.ts` file to redirect unauthenticated users from protected routes (e.g., `/dashboard`).
        *   In `src/app/(app)/layout.tsx`, use the `useAuth` hook to conditionally render content or redirect.
    *   **AI Help:** "Next.js 13 middleware for authentication."

**1.3. Privacy & Dual-State (Normal/Deep Mode)**

*   **1.3.1. Integrate `ModeContext` into `src/app/layout.tsx`:**
    *   **Action:** Wrap your application with `ModeProvider` to make the mode globally available.
        ```typescript
        // src/app/layout.tsx
        import { ModeProvider } from '@/context/ModeContext';
        // ... other imports

        export default function RootLayout({ children }: { children: React.ReactNode }) {
          return (
            <html lang="en">
              <body>
                <ModeProvider>{children}</ModeProvider>
              </body>
            </html>
          );
        }
        ```
    *   **AI Help:** "Global state management with React Context and Next.js."
*   **1.3.2. Implement `ModeToggle` Component (`src/components/layout/ModeToggle.tsx`):**
    *   **Action:** Use the `useMode` hook to create a button/switch that toggles between Normal and Deep modes.
*   **1.3.3. Update User Profile with Deep Mode Preference (`profiles` table):**
    *   **Action:** Modify the `profiles` table to include a `deep_mode` boolean field. When the user toggles the mode, update this in the Supabase `profiles` table.
    *   **Service:** `services/profileService.ts` for updating user profiles.

**1.4. Client-Side Encryption Logic (for Deep Mode)**

*   **1.4.1. Choose an Encryption Library:**
    *   **Action:** Install a lightweight, secure client-side encryption library. [`crypto-js`](https://www.npmjs.com/package/crypto-js) is a common choice for client-side.
    *   **Action:** `npm install crypto-js`
*   **1.4.2. Create `src/lib/encryption.ts`:**
    *   **Action:** Implement simple encryption/decryption functions. **Crucially, the encryption key should NOT be stored in your code.** Consider deriving it from a user-provided passphrase (asked *only* in Deep Mode) or a secure key management strategy. For now, a simple example using a temporary key.
        ```typescript
        // This is a simplified example. In production, securely manage your key.
        import CryptoJS from 'crypto-js';

        const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'super-secret-default-key'; // DO NOT USE DEFAULT IN PROD

        export const encryptData = (data: string): string => {
          return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
        };

        export const decryptData = (ciphertext: string): string => {
          const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
          return bytes.toString(CryptoJS.enc.Utf8);
        };
        ```
    *   **Action:** Add `NEXT_PUBLIC_ENCRYPTION_KEY=YOUR_SECURE_KEY` to `.env.local`. **Generate a truly random and long key.**
*   **1.4.3. Integrate Encryption with Deep Mode Data (e.g., Journal Entries):**
    *   **Action:** When saving a journal entry (or any sensitive data) in Deep Mode:
        *   Use `encryptData` before sending to Supabase.
        *   Store the encrypted text in the database.
    *   **Action:** When fetching and displaying sensitive data in Deep Mode:
        *   Fetch encrypted text from Supabase.
        *   Use `decryptData` before displaying.
    *   **Consideration:** Store a flag in the DB (`is_encrypted: true`) to know whether to decrypt.

---

### 6. AI Context & Project Setup Prompt for LifeOS

```
You are an expert Senior Lead Engineer and Full Stack Developer. Your task is to assist in building "LifeOS", a gamified personal growth engine, leveraging modern web technologies and AI.

Here's the full context you need for the LifeOS project:

---

## 1. Project Vision & Core Philosophy

**LifeOS** is a high-performance "Second Brain" and digital accountability partner for a 21-year-old engineering student. It bridges industrial-grade engineering (Instrumentation & Control) with cutting-edge AI (RL & LLMs).

*   **Gamification:** Life is a series of quests. Habits = XP. XP = Permission to indulge (e.g., social media time, snacks, spending).
*   **Dual-State Privacy:** The app operates in two modes:
    *   **Normal Mode:** Public / casual use, showing aggregated or non-sensitive data.
    *   **Deep Mode:** Sensitive tracking (sobriety, mental health, private journals). Data in this mode must be hidden, redacted, or aggregated in Normal Mode. Logs, analytics, and error messages must *never* leak Deep Mode details.
*   **AI Oracle:** An in-app AI guide that is constructive, firm, and analytical. It uses RAG to analyze journals, health data, and habit scores. Its tone and behavior are modifiable but should generally be firm but constructive, providing specific positive reinforcement and actionable next steps.
*   **Holistic Tracking:** Academic attendance, fitness, and "Comfort Zone" challenges.
*   **Vibe Coding:** The user wants to build fast with AI agents while understanding the underlying "why."

---

## 2. Technology Stack

*   **Framework:** Next.js 15 (App Router) + TypeScript.
*   **Styling:** Tailwind CSS + ShadcnUI (Modern, clean, dashboard-centric).
*   **Backend:** Supabase (Auth, Postgres DB, Edge Functions, Storage).
*   **AI Engine (Cloud):** OpenRouter (Claude 3.5 Sonnet for logic, Gemini 1.5 Flash for summaries).
*   **Local AI (Optional/Future):** Ollama + Qdrant (for local indexing and private AI analysis).

---

## 3. Application Architecture - Modular Monorepo

The project adheres to a "Modular Monorepo" style with a clear separation of concerns.

**Current `src/` Directory Structure (Feature-Based Architecture):**

```text
src/
  app/                # Next.js App Router (Routes, Layouts, Pages, API Endpoints)
  components/         # Shared components (layout-specific, non-domain)
    layout/         # Navigation, Headers, Footers
    ui/             # ShadcnUI primitives, generic UI elements
  context/            # Global state context (e.g., ModeContext)
  features/           # Domain-specific logic, components, and hooks
    ai/             # AI-related UI components (Oracle Chat, Summaries)
    dashboard/      # Main dashboard sections (Quest Board, XP Progress)
    forms/          # Reusable forms for data input (HealthLog, ReflectionForm)
    gamification/   # Logic/components for XP, indulgences, quests
    health/         # Food, workout, sobriety trackers
    memory/         # Image/video uploads for Memory Lane
    planner/        # Calendar, daily tasks, weekly/monthly planning
  hooks/              # Reusable React hooks (e.g., useAuth, useMode)
  lib/                # Shared utilities, external service integrations, ML models
    ml/             # Local ML model configurations, embedding utilities
    supabase/       # Supabase client initialization, specific utilities
    utils/          # General utility functions
  schemas/            # Zod schemas for validation
  services/           # Backend interaction logic (API calls, data manipulation)
    ai/             # AI orchestration logic (prompting, RAG integration)
    auth/           # Authentication-related services
    database/       # Generic database CRUD operations
    gamification/   # XP calculation, quest management
  store/              # Zustand/Context for global client-side state
  types/              # TypeScript type definitions (e.g., database.types.ts)
  styles/             # Global CSS, Tailwind config extensions (if needed)
```

**Key Architectural Decisions:**

*   **Server Components/Actions:** Maximize server-side rendering and data fetching.
*   **Modular Features:** Each domain (`gamification`, `health`, `planner`, etc.) gets its own `features/` subdirectory.
*   **Centralized Services:** `services/` contains all external API interactions and complex business logic.
*   **Clear State Management:** `context/` for global state, `store/` for complex client-side state, hooks for local component state.
*   **Strict Validation:** `schemas/` with Zod for all input validation.
*   **Environment Variables:** All secrets and API keys strictly loaded from `.env.local`.
*   **Privacy by Design:** `ModeContext` is central to controlling data visibility and access; server-side checks enforce privacy.

---

## 4. Detailed Feature Breakdown & Implementation Strategy

Refer to the `TRACKING/AllSteps.md` file for a comprehensive, granular breakdown of each feature and its implementation strategy, broken down into beginner-friendly steps across multiple phases.

---

## 5. Security & Privacy Rules (Critical)

*   **Rate Limiting:** Implement based on IP and authenticated user identity.
*   **Strict Validation:** Enforce Zod validation on all external inputs (forms, server actions, webhooks, Supabase payloads).
*   **No Hardcoded Secrets:** Only read API keys/secrets from environment variables.
*   **OWASP-Aligned:** Design features with XSS, CSRF, injection, auth, access control, logging in mind.
*   **Server-Side Preference:** Prefer Server Components/Actions over exposing sensitive logic to the client.
*   **Deep Mode Data Protection:** Always check Deep Mode toggle state. In Normal Mode, hide, redact, or aggregate sensitive data. Logs, analytics, and errors must *never* leak Deep Mode details.

---

## 6. AI Oracle Tone & Behavior

The in-app AI responses must be:

*   **Firm but constructive.**
*   Provide **constructive criticism** plus **specific positive reinforcement.**
*   Action-oriented (clear next steps, micro-quests, or habit tweaks).
*   **Personalized:** For the user (who is a soft person that learns with constructive criticism and positive reinforcement). The AI should find a middle ground, not too soft or too strict, and suggest improvements based on habits and results.

---

## 7. Current Project Status

*   **Phase 0: Professional Scaffolding & Industrial Refactor** - Completed
*   **Phase 1: Git Initialization & Remote Linking** - Completed
*   **Phase 2: Database Schema & Auth Setup** - Pending

---

With this context, you are ready to assist the user in building LifeOS step-by-step, focusing on one detailed task at a time, and adhering to all architectural, security, and philosophical guidelines.
```

### 8. Tracking Your Progress
*Whenever a step is finished, mark it [x] and run the "Sync Memex" command.*

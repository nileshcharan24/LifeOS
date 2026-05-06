# Supabase Setup Guide for LifeOS

Based on the requirements in `TRACKING/AllSteps.md`, here is the step-by-step guide to setting up your Supabase project.

## Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com/) and sign up or log in.
2. Click **"New Project"**, select your organization, and provide a project name (e.g., `lifeos-app`).
3. Generate a secure database password and choose a region close to you.
4. Click **"Create new project"** and wait for the database to provision.

## Step 2: Run SQL Schema Initialization
Once your project is ready, navigate to the **SQL Editor** from the left sidebar and click **"New Query"**. 

Copy and paste the following SQL snippets to create your tables, functions, and Row Level Security (RLS) policies.

```sql
/* ---------------------------------------------------------
   1. PROFILES TABLE 
   Extends Supabase Auth with LifeOS-specific metadata.
--------------------------------------------------------- */
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  email text,
  full_name text,
  avatar_url text,
  
  -- Gamification Stats
  total_xp integer default 0,
  level integer default 1,
  
  -- LifeOS Logic & Privacy
  deep_mode_active boolean default false,
  ai_custom_instructions text default 'I am a soft person who learns with constructive criticism and positive reinforcement. Be firm and critical of my mistakes, but find a middle ground. Suggest improvements in my life and track progress.',
  
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);


/* ---------------------------------------------------------
   2. QUESTS TABLE 
   Recurring habits that build your core XP.
--------------------------------------------------------- */
create table public.quests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  xp_reward integer not null default 10,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  
  -- Privacy/Logic flags
  is_private boolean default false, -- For Deep Mode filtering
  is_active boolean default true,
  last_completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.quests enable row level security;

-- Policies
create policy "Users manage own quests" on public.quests for all using (auth.uid() = user_id);


/* ---------------------------------------------------------
   3. DAILY_TASKS TABLE 
   One-off 'Side Quests' and daily to-do items.
--------------------------------------------------------- */
create table public.daily_tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  xp_reward integer default 5,
  due_date date default current_date,
  
  -- Status flags
  is_completed boolean default false,
  is_assigned_by_ai boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.daily_tasks enable row level security;

-- Policies
create policy "Users manage own tasks" on public.daily_tasks for all using (auth.uid() = user_id);


/* ---------------------------------------------------------
   4. INDULGENCES TABLE 
   The 'Shop' where you spend earned XP.
--------------------------------------------------------- */
create table public.indulgences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  xp_cost integer not null,
  category text check (category in ('entertainment', 'food', 'spending', 'other')),
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.indulgences enable row level security;

-- Policies
create policy "Users manage own shop" on public.indulgences for all using (auth.uid() = user_id);


/* ---------------------------------------------------------
   5. AUTOMATED PROFILE TRIGGER
   Automatically creates a Profile row when a user signs up.
--------------------------------------------------------- */
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

Click **"Run"** in the SQL Editor to execute the queries.

## Step 3: Configure Authentication
1. Go to **Authentication** > **Providers** in the Supabase dashboard.
2. Ensure **Email** is enabled.
3. Configure your Site URL in **URL Configuration** (e.g., `http://localhost:3000` for local dev).

## Step 4: Add Environment Variables
I will need your API keys to populate `.env.local`. Once you provide them, we will add:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
-- Complete SITA Database Schema with RLS and strict multi-user isolation

create extension if not exists "pgcrypto";

-- 1. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  reproductive_mode text not null default 'not-pregnant' check (reproductive_mode in ('not-pregnant','pregnant','postpartum')),
  privacy_enabled boolean not null default true,
  onboarding_complete boolean not null default false,
  date_of_birth date,
  typical_cycle_length integer default 28 check (typical_cycle_length between 15 and 60),
  typical_period_length integer default 5 check (typical_period_length between 1 and 15),
  last_period_date date,
  health_notes text,
  notification_preferences jsonb default '{"daily": true, "cycle": true, "hydration": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Cycle Logs
create table if not exists public.cycle_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_date date not null,
  end_date date,
  flow text check (flow in ('light','medium','heavy','spotting')),
  cramps integer check (cramps between 0 and 10),
  symptoms text[] not null default '{}',
  mood text,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, period_date)
);

-- 3. Moods / Mood Logs
create table if not exists public.moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood text not null check (mood in ('Very Happy', 'Good', 'Okay', 'Low', 'Stressed', 'Anxious', 'Tired', 'Energetic', 'Calm')),
  stress integer not null default 3 check (stress between 1 and 10),
  energy integer not null default 7 check (energy between 1 and 10),
  sleep text default '7h 20m',
  note text,
  logged_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- 4. Symptom Logs
create table if not exists public.symptom_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symptom text not null,
  category text not null default 'general',
  severity text check (severity in ('mild', 'moderate', 'severe')),
  logged_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- 5. Pregnancy Data
create table if not exists public.pregnancy_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pregnancy_start_date date,
  due_date date,
  kick_count integer default 0,
  last_kick_time timestamptz,
  appointments jsonb default '[]'::jsonb,
  symptoms text[] default '{}',
  notes text,
  updated_at timestamptz not null default now()
);

-- 6. Postpartum Data
create table if not exists public.postpartum_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  birth_date date default current_date,
  bleeding_level text check (bleeding_level in ('none', 'light', 'normal', 'heavy')),
  recovery_stage text,
  sleep_hours numeric,
  activity_level text check (activity_level in ('rest', 'gentle-walking', 'moderate', 'active')),
  kegel_count integer default 0,
  notes text,
  updated_at timestamptz not null default now()
);

-- 7. Screening Sessions (PCOS, Symptom Triage, Edinburgh Postpartum)
create table if not exists public.screening_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  screening_type text not null check (screening_type in ('pcos', 'symptom_triage', 'postpartum_edinburgh', 'general')),
  answers jsonb not null default '{}'::jsonb,
  structured_result jsonb not null default '{}'::jsonb,
  risk_level text check (risk_level in ('low', 'moderate', 'elevated', 'prompt_attention')),
  summary_explanation text,
  created_at timestamptz not null default now()
);

-- 8. Health Insights
create table if not exists public.health_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('cycle', 'mood', 'pregnancy', 'postpartum', 'general')),
  title text not null,
  insight_text text not null,
  created_at timestamptz not null default now()
);

-- 9. AI Conversations
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Health Companion Chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. Chat Messages
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.cycle_logs enable row level security;
alter table public.moods enable row level security;
alter table public.symptom_logs enable row level security;
alter table public.pregnancy_data enable row level security;
alter table public.postpartum_data enable row level security;
alter table public.screening_sessions enable row level security;
alter table public.health_insights enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.chat_messages enable row level security;

-- Row Level Security Policies ensuring complete user isolation
drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "cycle logs own rows" on public.cycle_logs;
create policy "cycle logs own rows" on public.cycle_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "moods own rows" on public.moods;
create policy "moods own rows" on public.moods for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "symptom logs own rows" on public.symptom_logs;
create policy "symptom logs own rows" on public.symptom_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "pregnancy data own rows" on public.pregnancy_data;
create policy "pregnancy data own rows" on public.pregnancy_data for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "postpartum data own rows" on public.postpartum_data;
create policy "postpartum data own rows" on public.postpartum_data for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "screening own rows" on public.screening_sessions;
create policy "screening own rows" on public.screening_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "insights own rows" on public.health_insights;
create policy "insights own rows" on public.health_insights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ai convs own rows" on public.ai_conversations;
create policy "ai convs own rows" on public.ai_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chat own rows" on public.chat_messages;
create policy "chat own rows" on public.chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Profile creation trigger on Supabase Auth signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

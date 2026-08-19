alter table public.profiles
  add column if not exists date_of_birth date,
  add column if not exists typical_cycle_length integer check (typical_cycle_length between 15 and 60),
  add column if not exists last_period_date date,
  add column if not exists health_notes text,
  add column if not exists onboarding_complete boolean not null default false;

create table if not exists public.pregnancy_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  due_date date,
  pregnancy_start_date date,
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.cycle_logs
  add column if not exists flow text check (flow in ('light','medium','heavy','spotting')),
  add column if not exists cramps integer check (cramps between 0 and 10),
  add column if not exists symptoms text[] not null default '{}';

create table if not exists public.postpartum_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birth_date date,
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.pregnancy_profiles enable row level security;
alter table public.postpartum_profiles enable row level security;
create policy "pregnancy profile own row" on public.pregnancy_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "postpartum profile own row" on public.postpartum_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Kirti',
  reproductive_mode text not null default 'not-pregnant' check (reproductive_mode in ('not-pregnant','pregnant','postpartum')),
  privacy_enabled boolean not null default true,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood text not null,
  stress integer not null check (stress between 1 and 10),
  energy integer not null check (energy between 1 and 10),
  sleep text,
  note text,
  logged_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.cycle_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, period_date)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.moods enable row level security;
alter table public.cycle_logs enable row level security;
alter table public.chat_messages enable row level security;

create policy "profiles own row" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "moods own rows" on public.moods for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cycle logs own rows" on public.cycle_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "chat own rows" on public.chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Kirti'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
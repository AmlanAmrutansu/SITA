-- SITA AI Chat & Longitudinal Medical Records Schema Enhancements
-- Adds support for user-confirmed structured medical documents, chat image metadata, and longitudinal query performance

-- 1. Ensure medical_records table with full structured memory columns
create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  document_type text not null default 'Medical Record',
  document_date date not null default current_date,
  doctor_name text,
  hospital_name text,
  extracted_text text,
  structured_data jsonb not null default '{}'::jsonb,
  user_confirmed boolean not null default true,
  verification_status text not null default 'verified' check (verification_status in ('pending_verification', 'verified', 'edited')),
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure optional columns exist if medical_records was already created
alter table public.medical_records add column if not exists doctor_name text;
alter table public.medical_records add column if not exists hospital_name text;
alter table public.medical_records add column if not exists user_confirmed boolean not null default true;
alter table public.medical_records add column if not exists verification_status text not null default 'verified';
alter table public.medical_records add column if not exists updated_at timestamptz not null default now();

-- Enable Row Level Security
alter table public.medical_records enable row level security;

-- Strict Multi-User Isolation Policies
drop policy if exists "Users can view own medical records" on public.medical_records;
create policy "Users can view own medical records"
  on public.medical_records for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own medical records" on public.medical_records;
create policy "Users can insert own medical records"
  on public.medical_records for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own medical records" on public.medical_records;
create policy "Users can update own medical records"
  on public.medical_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own medical records" on public.medical_records;
create policy "Users can delete own medical records"
  on public.medical_records for delete
  using (auth.uid() = user_id);

-- Performance Indexes for Longitudinal AI Context Retrieval
create index if not exists idx_medical_records_user_date on public.medical_records (user_id, document_date desc);
create index if not exists idx_chat_messages_user_created on public.chat_messages (user_id, created_at asc);
create index if not exists idx_screening_sessions_user_created on public.screening_sessions (user_id, created_at desc);
create index if not exists idx_cycle_logs_user_date on public.cycle_logs (user_id, period_date desc);
create index if not exists idx_symptom_logs_user_date on public.symptom_logs (user_id, logged_at desc);
create index if not exists idx_moods_user_date on public.moods (user_id, logged_at desc);

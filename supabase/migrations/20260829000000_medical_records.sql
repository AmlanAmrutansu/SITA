create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  document_type text not null,
  document_date date,
  extracted_text text,
  structured_data jsonb not null default '{}'::jsonb,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.medical_records enable row level security;

create policy "Users can view own medical records"
  on public.medical_records for select
  using (auth.uid() = user_id);

create policy "Users can insert own medical records"
  on public.medical_records for insert
  with check (auth.uid() = user_id);

create policy "Users can update own medical records"
  on public.medical_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own medical records"
  on public.medical_records for delete
  using (auth.uid() = user_id);

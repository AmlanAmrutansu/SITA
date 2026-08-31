-- Migration 004: SITA Health Memory & Longitudinal Record Continuity
-- Extends SITA database schema for persistent, user-specific medical documents,
-- structured medications, lab results, and cross-record comparison continuity with Row Level Security.

create table if not exists public.medical_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Medical Record',
  document_type text not null default 'Prescription' check (
    document_type in (
      'Prescription',
      'Lab Report',
      'Ultrasound Report',
      'Doctor Note',
      'Discharge Summary',
      'Medical Certificate',
      'Blood Report',
      'Imaging / Scan',
      'Other'
    )
  ),
  document_date date not null default current_date,
  doctor_name text,
  hospital_name text,
  extracted_text text,
  verification_status text not null default 'verified' check (verification_status in ('pending_verification', 'verified', 'edited')),
  structured_data jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backwards-compatible alias / view or table for medical_records
create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Medical Document',
  document_type text not null default 'Prescription',
  document_date date not null default current_date,
  doctor_name text,
  hospital_name text,
  extracted_text text,
  structured_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Normalized table for individual structured medications
create table if not exists public.medical_medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.medical_documents(id) on delete cascade,
  medication_name text not null,
  dosage text,
  frequency text,
  duration text,
  instructions text,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Normalized table for individual structured lab / diagnostic results
create table if not exists public.medical_lab_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.medical_documents(id) on delete cascade,
  test_name text not null,
  value text not null,
  numeric_value numeric,
  unit text,
  reference_range text,
  flag text check (flag in ('normal', 'low', 'high', 'abnormal', 'borderline', null)),
  recorded_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- Indices for performance
create index if not exists idx_medical_documents_user_date on public.medical_documents(user_id, document_date desc);
create index if not exists idx_medical_documents_user_type on public.medical_documents(user_id, document_type);
create index if not exists idx_medical_records_user_date on public.medical_records(user_id, document_date desc);
create index if not exists idx_medical_medications_user on public.medical_medications(user_id, medication_name);
create index if not exists idx_medical_lab_results_user on public.medical_lab_results(user_id, test_name, recorded_at desc);

-- Enable Row Level Security
alter table public.medical_documents enable row level security;
alter table public.medical_records enable row level security;
alter table public.medical_medications enable row level security;
alter table public.medical_lab_results enable row level security;

-- Row Level Security Policies (auth.uid() = user_id)
create policy "medical documents own rows" on public.medical_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "medical records own rows" on public.medical_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "medical medications own rows" on public.medical_medications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "medical lab results own rows" on public.medical_lab_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

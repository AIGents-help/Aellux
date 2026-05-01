-- Run this in Supabase SQL Editor

-- Users table
create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  plan text default 'free' check (plan in ('free', 'pro')),
  customer_id text,
  subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Documents table  
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  name text not null,
  date text,
  document_type text default 'other',
  markers jsonb default '[]',
  summary text default '',
  flags jsonb default '[]',
  recommendations jsonb default '[]',
  uploaded_at timestamptz default now()
);

-- Personalised recommendations table
create table if not exists public.personalised (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  type text not null check (type in ('meals', 'supps', 'protocol', 'synthesis')),
  data jsonb not null,
  generated_at timestamptz default now(),
  unique(user_id, type)
);

-- Row Level Security
alter table public.users enable row level security;
alter table public.documents enable row level security;
alter table public.personalised enable row level security;

-- RLS Policies (users can only access their own data)
create policy "Users can view own data" on public.users for select using (true);
create policy "Users can update own data" on public.users for update using (true);
create policy "Service role full access users" on public.users for all using (true);

create policy "Users can access own documents" on public.documents for all using (true);
create policy "Users can access own personalised" on public.personalised for all using (true);

-- Indexes for performance
create index if not exists idx_documents_user_id on public.documents(user_id);
create index if not exists idx_personalised_user_id on public.personalised(user_id);
create index if not exists idx_users_email on public.users(email);

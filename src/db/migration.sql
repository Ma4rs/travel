-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- This creates the table that stores which quests each user has completed.

create table if not exists public.completed_quests (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  quest_id text not null,
  completed_at timestamptz default now() not null,
  unique (user_id, quest_id)
);

-- Enable Row Level Security so users can only access their own data
alter table public.completed_quests enable row level security;

-- Policy: users can read their own completed quests
create policy "Users can read own completed quests"
  on public.completed_quests
  for select
  using (auth.uid() = user_id);

-- Policy: users can insert their own completed quests
create policy "Users can insert own completed quests"
  on public.completed_quests
  for insert
  with check (auth.uid() = user_id);

-- Policy: users can delete their own completed quests
create policy "Users can delete own completed quests"
  on public.completed_quests
  for delete
  using (auth.uid() = user_id);

-- Index for fast lookups by user
create index if not exists idx_completed_quests_user_id
  on public.completed_quests(user_id);

-- ============================================================
-- Photo Memory Album: photo storage for quest completions
-- ============================================================

-- Add photo_url column to completed_quests
alter table public.completed_quests
  add column if not exists photo_url text;

-- Policy: users can update their own completed quests (e.g. add photo later)
create policy "Users can update own completed quests"
  on public.completed_quests
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create a public storage bucket for quest photos
insert into storage.buckets (id, name, public)
values ('quest-photos', 'quest-photos', true)
on conflict (id) do nothing;

-- Storage policy: users can upload photos to their own folder
create policy "Users can upload own quest photos"
  on storage.objects for insert
  with check (
    bucket_id = 'quest-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policy: anyone can view quest photos (bucket is public)
create policy "Anyone can view quest photos"
  on storage.objects for select
  using (bucket_id = 'quest-photos');

-- Storage policy: users can overwrite their own photos
create policy "Users can update own quest photos"
  on storage.objects for update
  using (
    bucket_id = 'quest-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policy: users can delete their own photos
create policy "Users can delete own quest photos"
  on storage.objects for delete
  using (
    bucket_id = 'quest-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

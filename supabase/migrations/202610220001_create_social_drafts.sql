create table if not exists public.social_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('Threads')),
  content text not null check (char_length(content) between 1 and 5000),
  image_url text,
  scheduled_for timestamptz,
  status text not null default 'draft' check (status in ('draft', 'awaiting_approval', 'scheduled', 'publishing', 'published', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.social_drafts enable row level security;
revoke all on public.social_drafts from anon;
grant select, insert, update, delete on public.social_drafts to authenticated;

create policy "Users can read their own social drafts"
  on public.social_drafts for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own social drafts"
  on public.social_drafts for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own social drafts"
  on public.social_drafts for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own social drafts"
  on public.social_drafts for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists social_drafts_user_created_idx
  on public.social_drafts (user_id, created_at desc);

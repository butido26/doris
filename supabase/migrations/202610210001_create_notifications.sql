create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null unique,
  category text not null,
  title text not null,
  detail text not null default '',
  action_url text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.notifications enable row level security;

revoke all on public.notifications from anon;
grant select on public.notifications to authenticated;

create policy "Users can read their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

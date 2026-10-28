alter table public.social_drafts
  drop constraint if exists social_drafts_status_check;

alter table public.social_drafts
  add constraint social_drafts_status_check
  check (status in ('draft', 'awaiting_approval', 'approved', 'scheduled', 'publishing', 'published', 'failed'));

alter table public.social_drafts
  add column if not exists approved_at timestamptz,
  add column if not exists approved_via text check (approved_via in ('workbench', 'notion')),
  add column if not exists notion_page_id text,
  add column if not exists published_at timestamptz,
  add column if not exists platform_post_id text,
  add column if not exists published_url text,
  add column if not exists publish_error text;

create index if not exists social_drafts_approved_idx
  on public.social_drafts (status, scheduled_for)
  where status in ('approved', 'scheduled');

create unique index if not exists social_drafts_notion_page_id_uidx
  on public.social_drafts (notion_page_id)
  where notion_page_id is not null;

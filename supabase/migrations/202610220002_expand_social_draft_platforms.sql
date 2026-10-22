alter table public.social_drafts
  drop constraint if exists social_drafts_platform_check;

alter table public.social_drafts
  add constraint social_drafts_platform_check
  check (platform in ('Facebook', 'Instagram', 'Threads', 'LINE'));

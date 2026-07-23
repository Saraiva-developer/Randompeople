-- migration-notes.md already flagged `profile_ref` (free text) as debt to
-- replace with a real `profile_id` FK once the migration settles. This is
-- additive/non-destructive on purpose: `profile_ref` is not dropped here
-- because existing rows may not hold values that map cleanly to profiles.id
-- yet. Once application code writes profile_id for all new saves and a
-- backfill confirms old rows are covered, drop profile_ref in a follow-up
-- migration.

alter table public.saved_profiles
  add column if not exists profile_id uuid references public.profiles (id) on delete cascade;

create unique index if not exists saved_profiles_user_profile_idx
  on public.saved_profiles (user_id, profile_id)
  where profile_id is not null;

create index if not exists saved_profiles_profile_idx
  on public.saved_profiles (profile_id);

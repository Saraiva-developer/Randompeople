create table if not exists public.saved_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  profile_ref text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, profile_ref)
);

create index if not exists saved_profiles_user_idx
on public.saved_profiles (user_id, created_at desc);

alter table public.saved_profiles enable row level security;

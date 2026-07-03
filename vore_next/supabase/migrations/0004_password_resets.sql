create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists password_resets_token_hash_idx
on public.password_resets (token_hash);

create index if not exists password_resets_user_idx
on public.password_resets (user_id, created_at desc);

alter table public.password_resets enable row level security;

create table if not exists public.saved_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('media', 'item')),
  entry_key text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, kind, entry_key)
);

create index if not exists saved_entries_user_kind_idx
on public.saved_entries (user_id, kind, created_at desc);

drop trigger if exists saved_entries_set_updated_at on public.saved_entries;
create trigger saved_entries_set_updated_at
before update on public.saved_entries
for each row
execute function public.set_updated_at();

alter table public.saved_entries enable row level security;

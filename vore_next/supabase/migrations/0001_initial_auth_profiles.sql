create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text,
  account_type text not null default 'professional' check (account_type in ('professional', 'common')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  slug text not null unique,
  name text not null,
  type text not null check (type in ('service_pro', 'food', 'shop', 'lodging', 'creator')),
  bio text,
  location text,
  avatar_url text,
  cover_url text,
  data jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);
create index if not exists profiles_type_idx on public.profiles (type);
create index if not exists profiles_published_idx on public.profiles (is_published);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, account_type)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'account_type', 'professional')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = coalesce(excluded.name, public.users.name),
    account_type = excluded.account_type,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "users can read own row" on public.users;
create policy "users can read own row"
on public.users
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "users can update own row" on public.users;
create policy "users can update own row"
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "users can insert own row" on public.users;
create policy "users can insert own row"
on public.users
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "published profiles are public" on public.profiles;
create policy "published profiles are public"
on public.profiles
for select
to anon, authenticated
using (is_published = true or auth.uid() = user_id);

drop policy if exists "users can insert own profiles" on public.profiles;
create policy "users can insert own profiles"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own profiles" on public.profiles;
create policy "users can update own profiles"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete own profiles" on public.profiles;
create policy "users can delete own profiles"
on public.profiles
for delete
to authenticated
using (auth.uid() = user_id);

-- Normalized reviews table, matching the legacy `profile_reviews` behaviour
-- (api/reviews/upsert.php: one review per user per profile, atomic upsert).
-- The interim Supabase bridge (features/legacy-vore/reviews.ts) stored
-- reviews as a JSON array inside profiles.data, which read-modify-writes the
-- whole profile row and can lose concurrent reviews. This table replaces
-- that storage so writes are atomic and reviews can be queried/aggregated.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1200),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, user_id)
);

create index if not exists reviews_profile_idx on public.reviews (profile_id, created_at desc);
create index if not exists reviews_user_idx on public.reviews (user_id, created_at desc);

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();

alter table public.reviews enable row level security;

drop policy if exists "reviews are publicly readable" on public.reviews;
create policy "reviews are publicly readable"
on public.reviews
for select
to anon, authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.is_published = true
  )
);

-- Mirrors the legacy business rule: only "common" accounts can review, only
-- published profiles can be reviewed, and nobody can review their own profile.
drop policy if exists "user can review published profiles" on public.reviews;
create policy "user can review published profiles"
on public.reviews
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.account_type = 'common'
  )
  and exists (
    select 1 from public.profiles p
    where p.id = profile_id
      and p.is_published = true
      and p.user_id <> auth.uid()
  )
);

drop policy if exists "user can update own review" on public.reviews;
create policy "user can update own review"
on public.reviews
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user can delete own review" on public.reviews;
create policy "user can delete own review"
on public.reviews
for delete
to authenticated
using (auth.uid() = user_id);

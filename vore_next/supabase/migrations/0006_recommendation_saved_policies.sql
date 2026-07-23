-- RLS was enabled on these tables in earlier migrations but no policies were
-- ever added. All access today goes through the service-role (admin) client
-- in server actions, which bypasses RLS, so this was not exploitable — but it
-- means these tables are unreachable via the user-session client or anon key.
-- This adds real owner-scoped policies so that pattern is safe to use too.

-- recommendation_settings: user manages their own settings row
drop policy if exists "user can read own recommendation settings" on public.recommendation_settings;
create policy "user can read own recommendation settings"
on public.recommendation_settings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user can upsert own recommendation settings" on public.recommendation_settings;
create policy "user can insert own recommendation settings"
on public.recommendation_settings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user can update own recommendation settings" on public.recommendation_settings;
create policy "user can update own recommendation settings"
on public.recommendation_settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- recommendation_permissions: visible to both sides of the relationship
drop policy if exists "participants can read recommendation permissions" on public.recommendation_permissions;
create policy "participants can read recommendation permissions"
on public.recommendation_permissions
for select
to authenticated
using (auth.uid() = user_id or auth.uid() = target_user_id);

drop policy if exists "user can create recommendation permission request" on public.recommendation_permissions;
create policy "user can create recommendation permission request"
on public.recommendation_permissions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "participants can update recommendation permission" on public.recommendation_permissions;
create policy "participants can update recommendation permission"
on public.recommendation_permissions
for update
to authenticated
using (auth.uid() = user_id or auth.uid() = target_user_id)
with check (auth.uid() = user_id or auth.uid() = target_user_id);

drop policy if exists "user can delete own recommendation permission" on public.recommendation_permissions;
create policy "user can delete own recommendation permission"
on public.recommendation_permissions
for delete
to authenticated
using (auth.uid() = user_id);

-- recommendations: visible to sender and receiver only
drop policy if exists "participants can read recommendations" on public.recommendations;
create policy "participants can read recommendations"
on public.recommendations
for select
to authenticated
using (auth.uid() = sender_user_id or auth.uid() = receiver_user_id);

drop policy if exists "user can send recommendations" on public.recommendations;
create policy "user can send recommendations"
on public.recommendations
for insert
to authenticated
with check (auth.uid() = sender_user_id);

drop policy if exists "sender can delete own recommendation" on public.recommendations;
create policy "sender can delete own recommendation"
on public.recommendations
for delete
to authenticated
using (auth.uid() = sender_user_id);

-- recommendation_reactions: visible to reaction owner and the recommendation's participants
drop policy if exists "participants can read recommendation reactions" on public.recommendation_reactions;
create policy "participants can read recommendation reactions"
on public.recommendation_reactions
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.recommendations r
    where r.id = recommendation_id
      and (r.sender_user_id = auth.uid() or r.receiver_user_id = auth.uid())
  )
);

drop policy if exists "user can react to recommendation" on public.recommendation_reactions;
create policy "user can react to recommendation"
on public.recommendation_reactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user can update own reaction" on public.recommendation_reactions;
create policy "user can update own reaction"
on public.recommendation_reactions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user can delete own reaction" on public.recommendation_reactions;
create policy "user can delete own reaction"
on public.recommendation_reactions
for delete
to authenticated
using (auth.uid() = user_id);

-- saved_profiles: user manages their own saved list
drop policy if exists "user can read own saved profiles" on public.saved_profiles;
create policy "user can read own saved profiles"
on public.saved_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user can save profiles" on public.saved_profiles;
create policy "user can save profiles"
on public.saved_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user can remove own saved profile" on public.saved_profiles;
create policy "user can remove own saved profile"
on public.saved_profiles
for delete
to authenticated
using (auth.uid() = user_id);

-- saved_entries: user manages their own saved media/items
drop policy if exists "user can read own saved entries" on public.saved_entries;
create policy "user can read own saved entries"
on public.saved_entries
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user can create own saved entries" on public.saved_entries;
create policy "user can create own saved entries"
on public.saved_entries
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user can update own saved entries" on public.saved_entries;
create policy "user can update own saved entries"
on public.saved_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user can delete own saved entries" on public.saved_entries;
create policy "user can delete own saved entries"
on public.saved_entries
for delete
to authenticated
using (auth.uid() = user_id);

-- password_resets intentionally has no client-facing policies: it is a
-- transitional table only ever read/written by the admin (service-role)
-- client during the legacy-auth bridge, and goes away once auth fully
-- moves to Supabase Auth's own reset flow.

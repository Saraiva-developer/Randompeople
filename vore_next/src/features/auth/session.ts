import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase";

export const getCurrentSession = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session;
});

export const getCurrentUser = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
});

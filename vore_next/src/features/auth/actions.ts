"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { getSupabaseServerClient } from "@/lib/supabase";

function readField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWithMessage(path: "/login" | "/register", message: string) {
  const params = new URLSearchParams({ message });
  redirect(`${path}?${params.toString()}` as Route);
}

export async function loginAction(formData: FormData) {
  const email = readField(formData, "email").toLowerCase();
  const password = readField(formData, "password");

  if (!email || !password) {
    redirectWithMessage("/login", "Preenche email e password.");
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirectWithMessage("/login", error.message);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function registerAction(formData: FormData) {
  const name = readField(formData, "name");
  const email = readField(formData, "email").toLowerCase();
  const password = readField(formData, "password");
  const accountType = readField(formData, "accountType") || "professional";

  if (!name || !email || !password) {
    redirectWithMessage("/register", "Preenche nome, email e password.");
  }

  if (password.length < 6) {
    redirectWithMessage("/register", "A password deve ter pelo menos 6 caracteres.");
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        account_type: accountType
      }
    }
  });

  if (error) {
    redirectWithMessage("/register", error.message);
  }

  revalidatePath("/", "layout");
  redirectWithMessage(
    "/login",
    "Conta criada. Se a confirmacao de email estiver ativa, verifica o teu email antes de entrar."
  );
}

export async function logoutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

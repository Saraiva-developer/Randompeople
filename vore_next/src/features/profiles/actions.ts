"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { getCurrentUser } from "@/features/auth/session";
import { slugify } from "@/features/profiles/helpers";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { ProfileType } from "@/types/domain";
import type { Database, Json } from "@/types/supabase";

function readLines(formData: FormData, key: string) {
  return String(formData.get(key) ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseSchedule(lines: string[]) {
  const schedule: Record<string, string> = {};

  lines.forEach((line) => {
    const [rawDay, ...rest] = line.split(":");
    const day = String(rawDay || "").trim().toLowerCase();
    const value = rest.join(":").trim();
    if (!day || !value) return;
    schedule[day.slice(0, 3)] = value;
  });

  return schedule;
}

function parseAgenda(lines: string[]) {
  return lines
    .map((line) => {
      const [weekday, day, times] = line.split("|").map((part) => part.trim());
      if (!weekday && !day && !times) return null;

      return {
        weekday: weekday || "Agenda",
        day: day || "",
        times: times
          ? times
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean)
          : []
      };
    })
    .filter(Boolean);
}

function parsePartnerLines(lines: string[]) {
  return lines
    .map((line) => {
      const [name, category, location, image] = line.split("|").map((part) => part.trim());
      if (!name) return null;

      return {
        name,
        category: category || "",
        location: location || "",
        image: image || ""
      };
    })
    .filter(Boolean);
}

function parseLocationLines(lines: string[]) {
  return lines
    .map((line) => {
      const [name, address, link] = line.split("|").map((part) => part.trim());
      if (!name) return null;

      return {
        name,
        address: address || "",
        link: link || ""
      };
    })
    .filter(Boolean);
}

function parseContentItemLines(lines: string[]) {
  return lines
    .map((line) => {
      const [name, price, description, imageUrl] = line.split("|").map((part) => part.trim());
      if (!name) return null;

      return {
        name,
        price: price || "",
        description: description || "",
        imageUrl: imageUrl || "",
        images: imageUrl ? [imageUrl] : []
      };
    })
    .filter(Boolean);
}

function readField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWithMessage(path: "/edit-profile", message: string) {
  const params = new URLSearchParams({ message });
  redirect(`${path}?${params.toString()}` as Route);
}

export async function saveProfileAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?message=Faz login antes de criares o teu perfil." as Route);
  }

  const rawName = readField(formData, "name");
  const rawSlug = readField(formData, "slug");
  const location = readField(formData, "location");
  const bio = readField(formData, "bio");
  const category = readField(formData, "category");
  const rating = readField(formData, "rating");
  const avatarUrl = readField(formData, "avatarUrl");
  const coverUrl = readField(formData, "coverUrl");
  const instagram = readField(formData, "instagram");
  const website = readField(formData, "website");
  const whatsapp = readField(formData, "whatsapp");
  const type = readField(formData, "type") as ProfileType;
  const verified = formData.get("verified") === "on";
  const isPublished = formData.get("isPublished") === "on";
  const galleryPhotos = readLines(formData, "galleryPhotos");
  const galleryVideos = readLines(formData, "galleryVideos");
  const galleryReels = readLines(formData, "galleryReels");
  const scheduleLines = readLines(formData, "schedule");
  const agendaLines = readLines(formData, "agenda");
  const partnerLines = readLines(formData, "partners");
  const locationLines = readLines(formData, "locations");
  const servicesLines = readLines(formData, "services");
  const productsLines = readLines(formData, "products");
  const menuLines = readLines(formData, "menu");
  const portfolioLines = readLines(formData, "portfolio");
  const housesLines = readLines(formData, "houses");
  const roomsLines = readLines(formData, "rooms");
  const campaignsLines = readLines(formData, "campaigns");

  if (!rawName || !type) {
    redirectWithMessage("/edit-profile", "Preenche pelo menos nome e tipo de perfil.");
  }

  const slug = slugify(rawSlug || rawName);

  if (!slug) {
    redirectWithMessage("/edit-profile", "Nao foi possivel gerar um slug valido.");
  }

  const supabase = await getSupabaseServerClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, data")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const currentProfile = data as Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "data"> | null;

  const previousData =
    currentProfile?.data && typeof currentProfile.data === "object" && !Array.isArray(currentProfile.data)
      ? (currentProfile.data as Record<string, Json | undefined>)
      : {};

  const nextData: Record<string, Json | undefined> = {
    ...previousData,
    name: rawName,
    category: category || previousData.category || "",
    role: category || previousData.role || "",
    location: location || null,
    about: bio || null,
    aboutSummary: bio || null,
    rating: rating || null,
    avatar: avatarUrl || null,
    cover: coverUrl || null,
    verified,
    badge: verified ? "verif" : previousData.badge || "",
    website: website || null,
    site: website || null,
    social: {
      instagram: instagram || "",
      whatsapp: whatsapp || "",
      website: website || ""
    },
    gallery: {
      photos: galleryPhotos,
      videos: galleryVideos,
      reels: galleryReels
    },
    schedule: parseSchedule(scheduleLines),
    agenda: {
      slots: parseAgenda(agendaLines)
    },
    partners: parsePartnerLines(partnerLines),
    locations: parseLocationLines(locationLines),
    services: parseContentItemLines(servicesLines),
    products: parseContentItemLines(productsLines),
    menu: parseContentItemLines(menuLines),
    portfolio: parseContentItemLines(portfolioLines),
    houses: parseContentItemLines(housesLines),
    rooms: parseContentItemLines(roomsLines),
    campaigns: parseContentItemLines(campaignsLines)
  };

  const payload: Database["public"]["Tables"]["profiles"]["Insert"] = {
    id: currentProfile?.id,
    user_id: user.id,
    name: rawName,
    slug,
    type,
    location: location || null,
    bio: bio || null,
    avatar_url: avatarUrl || null,
    cover_url: coverUrl || null,
    is_published: isPublished,
    data: nextData
  };

  const profilesTable = supabase.from("profiles") as unknown as {
    upsert: (
      values: Database["public"]["Tables"]["profiles"]["Insert"]
    ) => Promise<{ error: { message: string } | null }>;
  };

  const { error } = await profilesTable.upsert(payload);

  if (error) {
    redirectWithMessage("/edit-profile", error.message);
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/edit-profile");
  revalidatePath(`/profile/${slug}` as Route);
  redirect(`/profile/${slug}` as Route);
}

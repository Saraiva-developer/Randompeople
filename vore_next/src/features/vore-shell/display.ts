import { profileTypeOptions } from "@/features/profiles/constants";
import { getProfileData } from "@/features/profiles/view";
import type { Database } from "@/types/supabase";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export function normalizeText(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getTypeLabel(type: string) {
  return profileTypeOptions.find((item) => item.value === type)?.label ?? "Perfil";
}

export function getBadgeType(profile: ProfileRow) {
  const data = getProfileData(profile.data);
  const raw = String(data.badge || "").trim().toLowerCase();
  if (raw === "verif" || data.verified === true) return "verif";
  if (raw === "promo") return "promo";
  if (raw === "novo") return "novo";
  return "";
}

export function resolveProfileFilter(profile: ProfileRow) {
  const data = getProfileData(profile.data);
  const explicit = String(data.filter || "").trim().toLowerCase();
  if (
    explicit === "destaques" ||
    explicit === "novidades" ||
    explicit === "promocoes" ||
    explicit === "perto"
  ) {
    return explicit;
  }

  const type = String(profile.type || data.type || "service_pro").toLowerCase();
  if (type === "shop") return "promocoes";
  if (type === "lodging") return "perto";
  if (type === "creator") return "novidades";
  return "destaques";
}

export function scoreLocal(profile: ProfileRow) {
  const data = getProfileData(profile.data);
  const filter = resolveProfileFilter(profile);
  const location = normalizeText(String(data.location || profile.location || ""));
  let score = 0;
  if (filter === "perto") score += 3;
  if (location.includes("portugal")) score += 1;
  if (location.includes("lisboa")) score += 1;
  return score;
}

export function getCardDisplayData(profile: ProfileRow) {
  const data = getProfileData(profile.data);
  const badge = getBadgeType(profile);
  const verified = badge === "verif";

  return {
    avatar: String(profile.avatar_url || data.avatar || "").trim(),
    badge,
    verified,
    rating: String(data.rating || "").trim(),
    category: String(data.category || data.role || getTypeLabel(profile.type)).trim() || "Perfil",
    location: String(data.location || profile.location || "Portugal").trim() || "Portugal"
  };
}

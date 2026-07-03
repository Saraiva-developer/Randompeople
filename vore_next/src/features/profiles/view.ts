import type { ProfileType } from "@/types/domain";
import type { Json } from "@/types/supabase";

export type ProfileData = Record<string, Json | undefined>;

export type ProfileTab = {
  id: string;
  label: string;
  type?: string;
  enabled?: boolean;
};

export type ProfileSection = {
  id: string;
  label: string;
  items: Array<Record<string, Json | undefined>>;
};

const TAB_BLUEPRINTS: Record<ProfileType, ProfileTab[]> = {
  service_pro: [
    { id: "sobre", label: "Sobre" },
    { id: "servicos", label: "Servicos" },
    { id: "galeria", label: "Galeria" },
    { id: "horario", label: "Horario" },
    { id: "agenda", label: "Agenda" },
    { id: "parcerias", label: "Parcerias" },
    { id: "locais", label: "Localizacao" }
  ],
  shop: [
    { id: "sobre", label: "Sobre" },
    { id: "produtos", label: "Produtos" },
    { id: "campanhas", label: "Campanhas" },
    { id: "galeria", label: "Galeria" },
    { id: "horario", label: "Horario" },
    { id: "locais", label: "Localizacao" },
    { id: "parcerias", label: "Parcerias" }
  ],
  food: [
    { id: "sobre", label: "Sobre" },
    { id: "menu", label: "Menu" },
    { id: "galeria", label: "Galeria" },
    { id: "horario", label: "Horario" },
    { id: "locais", label: "Localizacao" },
    { id: "agenda", label: "Agenda" }
  ],
  lodging: [
    { id: "sobre", label: "Sobre" },
    { id: "casas", label: "Casas" },
    { id: "quartos", label: "Quartos" },
    { id: "galeria", label: "Galeria" },
    { id: "agenda", label: "Agenda" },
    { id: "horario", label: "Horario" },
    { id: "locais", label: "Localizacao" }
  ],
  creator: [
    { id: "sobre", label: "Sobre" },
    { id: "portfolio", label: "Portfolio" },
    { id: "servicos", label: "Servicos" },
    { id: "galeria", label: "Galeria" },
    { id: "agenda", label: "Agenda" },
    { id: "locais", label: "Localizacao" },
    { id: "parcerias", label: "Parcerias" }
  ]
};

function asRecord(value: Json | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {};
}

function asArray(value: Json | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "geral";
}

function toBool(value: Json | null | undefined, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on", "sim"].includes(raw)) return true;
  if (["0", "false", "no", "off", "nao"].includes(raw)) return false;
  return fallback;
}

function toSections(value: Json | null | undefined) {
  const arr = asArray(value);

  if (!arr.length) {
    return [] as ProfileSection[];
  }

  const hasNestedItems = arr.some((entry) => {
    const record = asRecord(entry);
    return Array.isArray(record.items);
  });

  if (!hasNestedItems) {
    return [
      {
        id: "geral",
        label: "Geral",
        items: arr.map((entry) => asRecord(entry))
      }
    ];
  }

  return arr.map((entry, index) => {
    const record = asRecord(entry);
    const rawLabel = String(record.label || record.name || record.category || `Categoria ${index + 1}`);

    return {
      id: String(record.id || rawLabel).toLowerCase().replace(/\s+/g, "-"),
      label: rawLabel,
      items: asArray(record.items).map((item) => asRecord(item))
    };
  });
}

export function getProfileData(value: Json | null | undefined) {
  return asRecord(value);
}

function normalizeTab(value: Json | null | undefined, index: number): ProfileTab {
  const tab = asRecord(value);
  const type = String(tab.type || tab.id || `tab-${index + 1}`).trim().toLowerCase();
  const id = slugify(String(tab.id || type || `tab-${index + 1}`));
  const label = String(tab.label || tab.name || type || `Aba ${index + 1}`).trim() || `Aba ${index + 1}`;

  return {
    id,
    type,
    label,
    enabled: toBool(tab.enabled, true)
  };
}

export function getTabsForProfile(type: ProfileType, data?: ProfileData) {
  const customTabs = asArray(data?.tabs).map((tab, index) => normalizeTab(tab, index));
  const activeCustomTabs = customTabs.filter((tab) => tab.enabled !== false);
  if (activeCustomTabs.length) return activeCustomTabs;

  return (TAB_BLUEPRINTS[type] || TAB_BLUEPRINTS.service_pro).map((tab) => ({
    ...tab,
    type: tab.id,
    enabled: true
  }));
}

export function getProfileTabType(data: ProfileData, tabId: string) {
  const raw = String(tabId || "").trim().toLowerCase();
  const match = asArray(data.tabs)
    .map((tab, index) => normalizeTab(tab, index))
    .find((tab) => tab.id === raw || tab.type === raw);

  return String(match?.type || raw).trim().toLowerCase();
}

export function getProfileSections(data: ProfileData, tabId: string) {
  const tabType = getProfileTabType(data, tabId);

  if (tabType === "servicos") return toSections(data.servicesSections ?? data.services);
  if (tabType === "produtos") return toSections(data.productsSections ?? data.products);
  if (tabType === "menu") return toSections(data.menuSections ?? data.menu);
  if (tabType === "portfolio") return toSections(data.portfolioSections ?? data.portfolio);
  if (tabType === "casas") return toSections(data.housesSections ?? data.houses);
  if (tabType === "quartos") return toSections(data.roomsSections ?? data.rooms);
  if (tabType === "campanhas") return toSections(data.campaignSections ?? data.campaigns);

  if (tabType === "galeria") {
    const gallery = asRecord(data.gallery);
    const photos = asArray(gallery.photos ?? data.photos).map((url, index) => ({
      name: `Foto ${index + 1}`,
      mediaUrl: url,
      mediaType: "image"
    }));
    const videos = asArray(gallery.videos ?? data.videos).map((url, index) => ({
      name: `Video ${index + 1}`,
      mediaUrl: url,
      mediaType: "video"
    }));
    const reels = asArray(gallery.reels ?? data.reels).map((url, index) => ({
      name: `Reel ${index + 1}`,
      mediaUrl: url,
      mediaType: "video"
    }));

    return [
      { id: "photos", label: "Fotos", items: photos },
      { id: "videos", label: "Videos", items: videos },
      { id: "reels", label: "Reels", items: reels }
    ].filter((section) => section.items.length);
  }

  if (tabType === "horario") {
    const schedule = asRecord(data.schedule);
    const rows = [
      ["seg", "Segunda"],
      ["ter", "Terca"],
      ["qua", "Quarta"],
      ["qui", "Quinta"],
      ["sex", "Sexta"],
      ["sab", "Sabado"],
      ["dom", "Domingo"]
    ]
      .map(([key, label]) => ({
        name: label,
        time: String(schedule[key] || "").trim()
      }))
      .filter((item) => item.time);

    return rows.length ? [{ id: "horario", label: "Horario", items: rows }] : [];
  }

  if (tabType === "agenda") {
    const agenda = asRecord(data.agenda);
    const slots = asArray(agenda.slots).map((entry) => asRecord(entry));
    return slots.length ? [{ id: "agenda", label: "Agenda", items: slots }] : [];
  }

  if (tabType === "parcerias") {
    const partners = asArray(data.partners).map((entry) => asRecord(entry));
    return partners.length ? [{ id: "parcerias", label: "Parcerias", items: partners }] : [];
  }

  if (tabType === "locais") {
    const locations = asArray(data.locations).map((entry) => asRecord(entry));
    return locations.length ? [{ id: "locais", label: "Locais", items: locations }] : [];
  }

  return [];
}

export function getProfileBadgeType(data: ProfileData) {
  const badge = String(data.badge || "").trim().toLowerCase();

  if (badge === "verif" || data.verified === true) return "verif";
  if (badge === "promo") return "promo";
  if (badge === "novo") return "novo";

  return "";
}

export function getSocialItems(data: ProfileData) {
  const social = asRecord(data.social);
  const baseCandidates = [
    { id: "instagram", label: "Instagram", url: social.instagram || data.instagram },
    { id: "facebook", label: "Facebook", url: social.facebook || data.facebook },
    { id: "tiktok", label: "TikTok", url: social.tiktok || data.tiktok },
    { id: "youtube", label: "YouTube", url: social.youtube || data.youtube },
    { id: "whatsapp", label: "WhatsApp", url: social.whatsapp || data.whatsapp },
    { id: "website", label: "Website", url: social.website || data.website || data.site }
  ];
  const linkCandidates = asArray(data.links).map((entry, index) => {
    const link = asRecord(entry);
    const id = String(link.type || "website").trim().toLowerCase() || "website";
    return {
      id: `${id}-${index}`,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      url: link.url
    };
  });

  return [
    ...baseCandidates.filter((entry) => String(entry.url || "").trim()),
    ...linkCandidates
  ]
    .map((entry) => ({
      ...entry,
      url: String(entry.url || "").trim()
    }));
}

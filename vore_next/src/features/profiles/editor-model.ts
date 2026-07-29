import type { Json } from "@/types/supabase";
import type { ProfileType } from "@/types/domain";

/**
 * Content kinds the editor can produce, matching the shapes the native app's
 * EditProfileScreen writes and the public profile reads.
 */
export type ContentKind =
  | "servicos"
  | "menu"
  | "produtos"
  | "portfolio"
  | "casas"
  | "quartos"
  | "campanhas";

export type EditorItem = Record<string, string | boolean | string[]>;

export type EditorSection = {
  id: string;
  label: string;
  enabled: boolean;
  items: EditorItem[];
};

export type EditorTab = {
  id: string;
  type: string;
  label: string;
  enabled: boolean;
};

export type EditorState = {
  tabs: EditorTab[];
  content: Partial<Record<ContentKind, EditorSection[]>>;
};

export const KIND_LABELS: Record<ContentKind, string> = {
  servicos: "Serviços",
  menu: "Menu",
  produtos: "Produtos",
  portfolio: "Portfolio",
  casas: "Casas",
  quartos: "Quartos",
  campanhas: "Campanhas"
};

/** Which content kinds a profile type can edit, mirroring the app blueprints. */
export const KINDS_BY_TYPE: Record<ProfileType, ContentKind[]> = {
  service_pro: ["servicos", "portfolio"],
  shop: ["produtos", "campanhas"],
  food: ["menu"],
  lodging: ["casas", "quartos"],
  creator: ["portfolio", "servicos"]
};

export const SERVICE_TYPE_OPTIONS = [
  { value: "general", label: "Geral" },
  { value: "beauty", label: "Beleza" },
  { value: "wellness", label: "Bem-estar" },
  { value: "fitness", label: "Treino" },
  { value: "consulting", label: "Consultoria" }
];

type FieldType = "text" | "textarea" | "price" | "list" | "select" | "toggle";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  full?: boolean;
};

const PROMO_FIELDS: FieldDef[] = [
  { key: "promoEnabled", label: "Em promoção", type: "toggle" },
  { key: "promoOldPrice", label: "Preço antigo", type: "price", placeholder: "85" },
  { key: "promoNowPrice", label: "Preço promo", type: "price", placeholder: "70" }
];

/** Editable fields per content kind, in display order. */
export const FIELDS_BY_KIND: Record<ContentKind, FieldDef[]> = {
  servicos: [
    { key: "description", label: "Nome do serviço", type: "text", placeholder: "Sessão inicial", full: true },
    { key: "serviceType", label: "Tipo", type: "select", options: SERVICE_TYPE_OPTIONS },
    { key: "time", label: "Duração", type: "text", placeholder: "60" },
    { key: "price", label: "Preço", type: "price", placeholder: "45" },
    {
      key: "priceMode",
      label: "Modo de preço",
      type: "select",
      options: [
        { value: "fixed", label: "Preço fixo" },
        { value: "budget", label: "Sob orçamento" }
      ]
    },
    ...PROMO_FIELDS,
    { key: "extra1", label: "Detalhe 1", type: "text" },
    { key: "extra2", label: "Detalhe 2", type: "text" },
    { key: "note", label: "Nota", type: "text", full: true },
    { key: "image", label: "Imagem (URL)", type: "text", full: true }
  ],
  menu: [
    { key: "name", label: "Nome", type: "text", placeholder: "Prato do dia", full: true },
    { key: "price", label: "Preço", type: "price", placeholder: "12.5" },
    ...PROMO_FIELDS,
    { key: "shortDescription", label: "Descrição curta", type: "text", full: true },
    { key: "description", label: "Descrição", type: "textarea", full: true },
    { key: "image", label: "Imagem (URL)", type: "text", full: true }
  ],
  produtos: [
    { key: "name", label: "Nome", type: "text", placeholder: "Produto em destaque", full: true },
    { key: "price", label: "Preço", type: "price", placeholder: "39.9" },
    ...PROMO_FIELDS,
    { key: "sku", label: "SKU", type: "text" },
    {
      key: "stock",
      label: "Stock",
      type: "select",
      options: [
        { value: "in", label: "Em stock" },
        { value: "out", label: "Esgotado" }
      ]
    },
    { key: "size", label: "Tamanho", type: "text" },
    { key: "shortDescription", label: "Descrição curta", type: "text", full: true },
    { key: "fullDescription", label: "Descrição completa", type: "textarea", full: true },
    { key: "usage", label: "Como usar", type: "text", full: true },
    { key: "ingredients", label: "Materiais", type: "text", full: true },
    { key: "image", label: "Imagem (URL)", type: "text", full: true }
  ],
  portfolio: [
    { key: "name", label: "Nome do projeto", type: "text", placeholder: "Projeto de marca", full: true },
    { key: "description", label: "Descrição", type: "textarea", full: true },
    { key: "link", label: "Link", type: "text", full: true },
    { key: "image", label: "Imagem (URL)", type: "text", full: true }
  ],
  casas: [
    { key: "name", label: "Nome", type: "text", placeholder: "Apartamento principal", full: true },
    { key: "priceNight", label: "Preço/noite", type: "price", placeholder: "95" },
    ...PROMO_FIELDS,
    { key: "capacity", label: "Capacidade", type: "text", placeholder: "4 hóspedes" },
    { key: "beds", label: "Camas", type: "text", placeholder: "2 camas" },
    { key: "bathrooms", label: "WC", type: "text", placeholder: "1 casa de banho" },
    { key: "availability", label: "Disponibilidade", type: "text" },
    { key: "checkIn", label: "Check-in", type: "text", placeholder: "15:00" },
    { key: "checkOut", label: "Check-out", type: "text", placeholder: "11:00" },
    { key: "description", label: "Descrição", type: "textarea", full: true },
    { key: "amenities", label: "Comodidades (uma por linha)", type: "list", full: true },
    { key: "houseRules", label: "Regras (uma por linha)", type: "list", full: true },
    { key: "images", label: "Imagens (uma por linha)", type: "list", full: true }
  ],
  quartos: [],
  campanhas: [
    { key: "title", label: "Título", type: "text", placeholder: "Campanha da semana", full: true },
    { key: "badge", label: "Etiqueta", type: "text", placeholder: "-30%" },
    { key: "image", label: "Imagem (URL)", type: "text", full: true },
    { key: "video", label: "Vídeo (URL)", type: "text", full: true }
  ]
};

FIELDS_BY_KIND.quartos = FIELDS_BY_KIND.casas;

function str(value: unknown) {
  return String(value ?? "").trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function boolLike(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const raw = str(value).toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on", "sim"].includes(raw)) return true;
  if (["0", "false", "no", "off", "nao", "não"].includes(raw)) return false;
  return fallback;
}

function toLines(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((entry) => str(entry)).filter(Boolean);
  return str(value)
    .split(/[\n;]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function blankItem(kind: ContentKind): EditorItem {
  const item: EditorItem = { enabled: true };
  FIELDS_BY_KIND[kind].forEach((field) => {
    if (field.type === "toggle") item[field.key] = false;
    else if (field.type === "list") item[field.key] = [];
    else if (field.type === "select") item[field.key] = field.options?.[0]?.value || "";
    else item[field.key] = "";
  });
  if (kind === "servicos") item.modalImageEnabled = true;
  if (kind === "produtos") item.modalImageEnabled = true;
  return item;
}

export function blankSection(kind: ContentKind, index: number): EditorSection {
  return {
    id: `sec-${Date.now()}-${index}`,
    label: `Secção ${index + 1}`,
    enabled: true,
    items: [blankItem(kind)]
  };
}

function readItem(raw: unknown, kind: ContentKind): EditorItem {
  const source = asRecord(raw);
  const item: EditorItem = { enabled: !(source.enabled === false || source.active === false) };

  FIELDS_BY_KIND[kind].forEach((field) => {
    if (field.type === "toggle") {
      item[field.key] = boolLike(source[field.key] ?? source.isPromo ?? source.promo);
      return;
    }
    if (field.type === "list") {
      item[field.key] = toLines(source[field.key]);
      return;
    }
    if (field.key === "priceMode") {
      const budget =
        str(source.priceMode || source.budgetMode).toLowerCase() === "budget" ||
        source.isBudget === true ||
        boolLike(source.quoteOnly);
      item[field.key] = budget ? "budget" : "fixed";
      return;
    }
    if (field.key === "serviceType") {
      item[field.key] = str(source.serviceType || source.type) || "general";
      return;
    }
    if (field.key === "stock") {
      item[field.key] = str(source.stock).toLowerCase() === "out" ? "out" : "in";
      return;
    }
    if (field.key === "description" && kind === "servicos") {
      item[field.key] = str(source.description || source.name);
      return;
    }
    if (field.key === "image") {
      item[field.key] = str(source.image || source.imageUrl) || toLines(source.images)[0] || "";
      return;
    }
    if (field.key === "video") {
      item[field.key] = str(source.video || source.videoUrl) || toLines(source.videos)[0] || "";
      return;
    }
    item[field.key] = str(source[field.key]);
  });

  if (kind === "servicos" || kind === "produtos") {
    item.modalImageEnabled = !(
      source.modalImageEnabled === false || source.showImageInModal === false
    );
  }
  return item;
}

/** Reads stored `*Sections` (or a flat legacy array) into editor state. */
export function readSections(
  rawSections: unknown,
  rawFlat: unknown,
  kind: ContentKind
): EditorSection[] {
  let sections = asArray(rawSections);
  if (!sections.length) {
    const flat = asArray(rawFlat);
    if (flat.length) sections = [{ id: "geral", label: "Geral", items: flat }];
  }
  if (!sections.length) return [];

  return sections.map((entry, index) => {
    const section = asRecord(entry);
    const items = asArray(section.items).map((item) => readItem(item, kind));
    return {
      id: str(section.id) || `sec-${index}`,
      label: str(section.label || section.name) || `Secção ${index + 1}`,
      enabled: !(section.enabled === false || section.active === false),
      items: items.length ? items : [blankItem(kind)]
    };
  });
}

function itemHasContent(item: EditorItem, kind: ContentKind) {
  return FIELDS_BY_KIND[kind].some((field) => {
    const value = item[field.key];
    if (field.type === "toggle") return false;
    if (field.type === "list") return Array.isArray(value) && value.length > 0;
    if (field.type === "select") return false;
    return str(value).length > 0;
  });
}

function writeItem(item: EditorItem, kind: ContentKind): Record<string, Json> {
  const out: Record<string, Json> = { enabled: item.enabled !== false };

  FIELDS_BY_KIND[kind].forEach((field) => {
    const value = item[field.key];
    if (field.type === "toggle") {
      out[field.key] = !!value;
      return;
    }
    if (field.type === "list") {
      out[field.key] = Array.isArray(value) ? value.filter(Boolean) : [];
      return;
    }
    out[field.key] = str(value);
  });

  // Aliases the public profile and the mobile app also read.
  if (kind === "servicos") {
    out.name = str(item.description);
    out.type = str(item.serviceType) || "general";
    const budget = str(item.priceMode) === "budget";
    out.isBudget = budget;
    out.quoteOnly = budget;
    out.budgetMode = budget ? "budget" : "fixed";
    out.detail1 = str(item.extra1);
    out.detail2 = str(item.extra2);
    out.notes = str(item.note);
    out.modalImageEnabled = item.modalImageEnabled !== false;
    out.showImageInModal = item.modalImageEnabled !== false;
  }
  if (kind === "produtos") {
    out.modalImageEnabled = item.modalImageEnabled !== false;
    out.showImageInModal = item.modalImageEnabled !== false;
  }
  if (kind === "campanhas") {
    out.name = str(item.title);
    out.images = str(item.image) ? [str(item.image)] : [];
    out.videos = str(item.video) ? [str(item.video)] : [];
  }
  if (kind === "casas" || kind === "quartos") {
    const images = Array.isArray(item.images) ? item.images.filter(Boolean) : [];
    out.images = images;
    if (!str(item.image) && images[0]) out.image = images[0];
  }
  if (!str(out.imageUrl) && str(item.image)) out.imageUrl = str(item.image);

  return out;
}

/** Serializes editor state back into the `*Sections` payload shape. */
export function writeSections(sections: EditorSection[], kind: ContentKind) {
  return sections
    .map((section, index) => ({
      id: section.id || `sec-${index}`,
      label: str(section.label) || `Secção ${index + 1}`,
      enabled: section.enabled !== false,
      items: section.items.filter((item) => itemHasContent(item, kind)).map((item) => writeItem(item, kind))
    }))
    .filter((section) => section.items.length > 0);
}

export const SECTIONS_DATA_KEY: Record<ContentKind, string> = {
  servicos: "servicesSections",
  menu: "menuSections",
  produtos: "productsSections",
  portfolio: "portfolioSections",
  casas: "housesSections",
  quartos: "roomsSections",
  campanhas: "campaignSections"
};

export const FLAT_DATA_KEY: Record<ContentKind, string> = {
  servicos: "services",
  menu: "menu",
  produtos: "products",
  portfolio: "portfolio",
  casas: "houses",
  quartos: "rooms",
  campanhas: "campaigns"
};

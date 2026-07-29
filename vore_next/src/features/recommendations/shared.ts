export type ShareUser = {
  id: string;
  name: string;
  email: string;
};

export type ShareItemPayload = {
  kind: string;
  section: string;
  name: string;
  price: string;
  oldPrice: string;
  time: string;
  note: string;
  image: string;
};

export type ShareEntry = {
  id: number;
  direction: "received" | "sent";
  contentType: "profile" | "photo" | "video" | "reel";
  contentUri: string;
  profileSlug: string;
  sourceProfileName: string;
  createdAt: string;
  expiresAt: string;
  item: ShareItemPayload | null;
};

export type ShareConversation = {
  userId: string;
  name: string;
  email: string;
  entries: ShareEntry[];
  lastAt: string;
};

export type PermissionRequest = {
  senderUserId: string;
  senderName: string;
  senderEmail: string;
  createdAt: string;
};

const ITEM_SHARE_PREFIX = "itemshare:";

const ITEM_KINDS = ["service", "product", "menu", "portfolio", "house", "room", "campaign"];

export const ITEM_KIND_LABELS: Record<string, string> = {
  service: "Serviço",
  product: "Produto",
  menu: "Menu",
  portfolio: "Portfolio",
  house: "Casa",
  room: "Quarto",
  campaign: "Campanha"
};

/** Encodes an item snapshot the same way the native app does. */
export function buildItemShareUri(payload: ShareItemPayload) {
  try {
    return `${ITEM_SHARE_PREFIX}${encodeURIComponent(JSON.stringify({ v: 1, ...payload }))}`;
  } catch {
    return "";
  }
}

export function parseItemShareUri(rawValue: string): ShareItemPayload | null {
  const raw = String(rawValue || "").trim();
  if (!raw.startsWith(ITEM_SHARE_PREFIX)) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw.slice(ITEM_SHARE_PREFIX.length)));
    if (!parsed || typeof parsed !== "object") return null;
    const kind = String(parsed.kind || "").trim().toLowerCase();
    if (!ITEM_KINDS.includes(kind)) return null;
    return {
      kind,
      section: String(parsed.section || "").trim(),
      name: String(parsed.name || "").trim(),
      price: String(parsed.price || "").trim(),
      oldPrice: String(parsed.oldPrice || "").trim(),
      time: String(parsed.time || "").trim(),
      note: String(parsed.note || "").trim(),
      image: String(parsed.image || "").trim()
    };
  } catch {
    return null;
  }
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProfileType } from "@/types/domain";
import type { Json } from "@/types/supabase";
import { getProfileData, getTabsForProfile } from "@/features/profiles/view";
import { ShareButton } from "@/features/recommendations/share-modal";
import { buildItemShareUri } from "@/features/recommendations/shared";
import { SaveEntryButton } from "@/features/saved/save-entry-button";
import { itemEntryKey, mediaEntryKey } from "@/features/saved/entries";

type Item = Record<string, unknown>;

type Section = {
  id: string;
  label: string;
  items: Item[];
};

/* ---------- helpers ported from vore_mobile_native ProfileScreen ---------- */

function str(value: unknown) {
  return String(value ?? "").trim();
}

function rec(value: unknown): Item {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Item) : {};
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function boolLike(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const raw = str(value).toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "y", "on", "sim"].includes(raw)) return true;
  if (["0", "false", "no", "n", "off", "nao", "não"].includes(raw)) return false;
  return fallback;
}

function isDisabled(entry: Item) {
  const enabled = entry.enabled ?? entry.active;
  if (enabled === undefined || enabled === null || str(enabled) === "") return false;
  return !boolLike(enabled, true);
}

function normalizePrice(value: unknown) {
  const raw = str(value);
  if (!raw) return "";
  const cleaned = raw.replace(/\s*(eur|euro|euros)\b/gi, "").trim();
  if (!cleaned) return "";
  if (cleaned.includes("€")) return cleaned.replace(/\s*€\s*/g, "€");
  return `${cleaned}€`;
}

function normalizeSections(rawSections: unknown, rawFlat: unknown, fallbackLabel: string): Section[] {
  let sections = arr(rawSections);
  if (!sections.length) {
    const flat = arr(rawFlat);
    if (flat.length) sections = [{ id: "base", label: fallbackLabel, items: flat }];
  }
  return sections
    .map((entry, idx) => {
      const sec = rec(entry);
      return {
        id: str(sec.id) || `${fallbackLabel}-${idx + 1}`,
        label: str(sec.label) || fallbackLabel,
        disabled: isDisabled(sec),
        items: arr(sec.items).map((item) => rec(item))
      };
    })
    .filter((sec) => !sec.disabled)
    .map((sec) => ({ ...sec, items: sec.items.filter((item) => !isDisabled(item)) }))
    .filter((sec) => sec.items.length)
    .map(({ id, label, items }) => ({ id, label, items }));
}

function isBudgetItem(item: Item) {
  return (
    str(item.priceMode || item.budgetMode).toLowerCase() === "budget" ||
    item.isBudget === true ||
    item.quoteOnly === true ||
    boolLike(item.quoteOnly)
  );
}

function promoOf(item: Item) {
  const enabled = boolLike(item.promoEnabled) || item.isPromo === true || item.promo === true;
  const now = normalizePrice(item.promoNowPrice || item.newPrice || item.priceNow);
  const old = normalizePrice(item.promoOldPrice || item.oldPrice || item.priceBefore);
  return { show: enabled && !!now, now, old };
}

function withPromoSection(baseSections: Section[], idPrefix: string, excludeBudget = false): Section[] {
  // If the owner already curates a "Promoções" section, don't add a second one.
  const hasOwnPromoSection = baseSections.some((sec) =>
    /promo/i.test(`${sec.id} ${sec.label}`.normalize("NFD").replace(/[̀-ͯ]/g, ""))
  );
  if (hasOwnPromoSection) return baseSections;

  const promoItems = baseSections.flatMap((sec) =>
    sec.items.filter((item) => {
      if (excludeBudget && isBudgetItem(item)) return false;
      return promoOf(item).show;
    })
  );
  return promoItems.length
    ? [{ id: `${idPrefix}-promocoes`, label: "Promoções", items: promoItems }, ...baseSections]
    : baseSections;
}

function mediaList(value: unknown): string[] {
  let list: unknown = value;
  if (typeof list === "string") {
    const raw = list.trim();
    if (!raw) return [];
    if (raw.includes(",") || raw.includes("\n")) {
      list = raw.split(/[\n,]/g).map((entry) => entry.trim());
    } else {
      list = [raw];
    }
  }
  if (list && typeof list === "object" && !Array.isArray(list)) {
    list = Object.values(list);
  }
  return arr(list)
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      const item = rec(entry);
      return str(item.url || item.src || item.uri || item.path || item.image || item.value);
    })
    .filter(Boolean);
}

function uniqueList(list: string[]) {
  return [...new Set(list.filter(Boolean))];
}

function itemImages(item: Item): string[] {
  const gallery = rec(item.gallery);
  return uniqueList([
    ...mediaList(item.images),
    ...mediaList(gallery.photos),
    ...mediaList(item.photos),
    ...mediaList(item.image || item.imageUrl)
  ]);
}

function isVideoUrl(uri: string) {
  const raw = uri.toLowerCase();
  if (raw.startsWith("data:video/")) return true;
  return /\.(mp4|mov|webm|m4v|avi)(\?.*)?$/.test(raw);
}

function toOpenableUrl(rawValue: unknown) {
  const raw = str(rawValue);
  if (!raw) return "";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(raw)) return raw;
  if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(raw)) return `mailto:${raw}`;
  if (/^\+?[\d\s()-]{7,}$/.test(raw)) return `tel:${raw.replace(/\s+/g, "")}`;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
  return "";
}

function mapsUrlFor(loc: Item) {
  const explicit = toOpenableUrl(loc.link);
  if (explicit) return explicit;
  const coordsText = str(loc.coords);
  const match = coordsText.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (match) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${match[1]},${match[2]}`)}`;
  }
  const queryText = [str(loc.address), str(loc.title || loc.name)].filter(Boolean).join(" ");
  if (queryText) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryText)}`;
  }
  return "";
}

const WEEKDAYS: Array<[string, string]> = [
  ["seg", "Segunda"],
  ["ter", "Terça"],
  ["qua", "Quarta"],
  ["qui", "Quinta"],
  ["sex", "Sexta"],
  ["sab", "Sábado"],
  ["dom", "Domingo"]
];

function serviceTypeLabel(value: unknown) {
  const key = str(value).toLowerCase();
  if (key === "beauty") return "Beleza";
  if (key === "wellness") return "Bem-estar";
  if (key === "fitness") return "Treino";
  if (key === "consulting") return "Consultoria";
  if (key === "general") return "Geral";
  return str(value);
}

function extraFieldRows(item: Item) {
  return arr(item.extraFields || item.attributes || item.specs)
    .map((entry) => {
      const field = rec(entry);
      const label = str(field.label || field.name || field.key);
      const value = str(field.value || field.content);
      const description = str(field.description || field.desc || field.details);
      const composed = [value, description].filter(Boolean).join(" — ");
      return { label: label || "Detalhe", value: composed };
    })
    .filter((row) => row.value);
}

/* ---------- small SVG icons ---------- */

function Icon({ path, size = 14, color = "currentColor", filled = false }: {
  path: string;
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} aria-hidden="true">
      <path
        d={path}
        stroke={filled ? "none" : color}
        strokeWidth={filled ? 0 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ICONS = {
  clock: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  calendar: "M8 3v3m8-3v3M4 8h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
  map: "M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Zm0 0v14m6-12v14",
  people: "M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 8v-1a4 4 0 0 0-3-3.87M15 5.13A3 3 0 0 1 15 11",
  bed: "M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M3 18v2m18-2v2M7 10V7h10v3",
  drop: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z",
  login: "M14 3h5v18h-5M4 12h10m0 0-4-4m4 4-4 4",
  logout: "M10 3H5v18h5m4-9H9m10 0-4-4m4 4-4 4",
  check: "m5 12.5 4.5 4.5L19 7",
  tag: "M4 4h7l9 9-7 7-9-9V4Zm4 4h.01",
  play: "M8 5.5v13l11-6.5-11-6.5Z",
  video: "M4 6h11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm12 4 5-3v10l-5-3",
  image: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-5 7 6-6 4 4 3-3 5 5",
  chevronLeft: "m14.5 6-5 6 5 6",
  chevronRight: "m9.5 6 5 6-5 6",
  close: "m6 6 12 12M18 6 6 18",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  grid: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
  link: "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"
};

/* ---------- modal state types ---------- */

type ItemModal = {
  kind: "service" | "product" | "menu" | "portfolio" | "campaign";
  item: Item;
  sectionLabel: string;
  imageIndex: number;
};

type Lightbox = {
  items: string[];
  index: number;
  isVideo: boolean;
};

export function ProfileTabsClient({
  profileType,
  data,
  about,
  initialTab,
  profileId = "",
  profileSlug = "",
  profileName = "",
  canInteract = false,
  savedEntryKeys = []
}: {
  profileType: ProfileType;
  data: Json | null;
  about: string;
  initialTab?: string;
  /** Sharing/saving of items and media is a personal-account feature. */
  profileId?: string;
  profileSlug?: string;
  profileName?: string;
  canInteract?: boolean;
  savedEntryKeys?: string[];
}) {
  const savedKeys = useMemo(() => new Set(savedEntryKeys), [savedEntryKeys]);
  const profileData = useMemo(() => getProfileData(data), [data]);
  const tabs = useMemo(
    () => getTabsForProfile(profileType, profileData),
    [profileType, profileData]
  );

  const [activeTabId, setActiveTabId] = useState(() => {
    const requested = str(initialTab).toLowerCase();
    return tabs.some((tab) => tab.id === requested) ? requested : tabs[0]?.id || "sobre";
  });
  const [galleryView, setGalleryView] = useState<"photos" | "videos">("photos");
  const [sectionIds, setSectionIds] = useState<Record<string, string>>({});
  const [lodgingItemIndex, setLodgingItemIndex] = useState<Record<string, number>>({});
  const [lodgingMediaIndex, setLodgingMediaIndex] = useState<Record<string, number>>({});
  const [amenitiesExpanded, setAmenitiesExpanded] = useState<Record<string, boolean>>({});
  const [viewModes, setViewModes] = useState<Record<string, "list" | "grid">>({});
  const [itemModal, setItemModal] = useState<ItemModal | null>(null);
  const [lightbox, setLightbox] = useState<Lightbox | null>(null);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0] || null;
  const activeType = str(activeTab?.type || activeTab?.id || "sobre").toLowerCase();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (lightbox) setLightbox(null);
      else if (itemModal) setItemModal(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox, itemModal]);

  function switchTab(tabId: string) {
    setActiveTabId(tabId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId);
      window.history.replaceState(null, "", url.toString());
    }
  }

  /* ---------- gallery data ---------- */

  const gallery = rec(profileData.gallery);
  const photoUrls = useMemo(
    () =>
      uniqueList([
        ...mediaList(gallery.photos ?? gallery.fotos ?? gallery.images),
        ...(arr(gallery.photos).length ? [] : mediaList(profileData.photos ?? profileData.fotos))
      ]),
    [gallery, profileData]
  );
  const videoUrls = useMemo(
    () =>
      uniqueList([
        ...mediaList(gallery.videos ?? profileData.videos),
        ...mediaList(gallery.reels ?? profileData.reels)
      ]),
    [gallery, profileData]
  );

  /* ---------- sections per tab type ---------- */

  function sectionsForType(type: string): Section[] {
    if (type === "servicos") {
      return withPromoSection(
        normalizeSections(profileData.servicesSections, profileData.services, "Serviços"),
        "services",
        true
      );
    }
    if (type === "menu") {
      return withPromoSection(
        normalizeSections(profileData.menuSections, profileData.menu, "Menu"),
        "menu"
      );
    }
    if (type === "produtos") {
      return withPromoSection(
        normalizeSections(profileData.productsSections, profileData.products, "Produtos"),
        "products"
      );
    }
    if (type === "portfolio" || type === "portofolio") {
      return normalizeSections(profileData.portfolioSections, profileData.portfolio, "Portfolio");
    }
    if (type === "casas") {
      return withPromoSection(
        normalizeSections(profileData.housesSections, profileData.houses, "Casas"),
        "casas"
      );
    }
    if (type === "quartos") {
      return withPromoSection(
        normalizeSections(profileData.roomsSections, profileData.rooms, "Quartos"),
        "quartos"
      );
    }
    return [];
  }

  function activeSectionFor(type: string, sections: Section[]) {
    const selected = sectionIds[type];
    return sections.find((sec) => sec.id === selected) || sections[0] || null;
  }

  /* ---------- subtabs ---------- */

  function renderSubtabs() {
    if (activeType === "galeria" || activeType === "fotos") {
      if (!photoUrls.length && !videoUrls.length) return null;
      return (
        <div className="pnt-subtabs">
          {(
            [
              ["photos", "Fotos"],
              ["videos", "Vídeos"]
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`pnt-subtab${galleryView === key ? " is-active" : ""}`}
              onClick={() => setGalleryView(key)}
            >
              {label}
            </button>
          ))}
        </div>
      );
    }

    const sectionTypes = ["servicos", "menu", "produtos", "portfolio", "portofolio", "casas", "quartos"];
    if (!sectionTypes.includes(activeType)) return null;

    const sections = sectionsForType(activeType);
    const activeSection = activeSectionFor(activeType, sections);
    const isLodging = activeType === "casas" || activeType === "quartos";
    const items = isLodging && activeSection ? activeSection.items : [];
    const itemIdx = Math.max(0, Math.min(lodgingItemIndex[activeType] || 0, Math.max(0, items.length - 1)));
    const labelBase = activeType === "casas" ? "Casa" : "Quarto";

    const sectionRow =
      sections.length > 1 && activeSection ? (
        <div className="pnt-subtabs">
          {sections.map((sec) => {
            const isPromo = /(^|-)promocoes$/.test(sec.id);
            const active = sec.id === activeSection.id;
            return (
              <button
                key={sec.id}
                type="button"
                className={`pnt-subtab${isPromo ? " is-promo" : ""}${active ? " is-active" : ""}`}
                onClick={() => {
                  setSectionIds((current) => ({ ...current, [activeType]: sec.id }));
                  if (isLodging) {
                    setLodgingItemIndex((current) => ({ ...current, [activeType]: 0 }));
                    setLodgingMediaIndex((current) => ({ ...current, [activeType]: 0 }));
                    setAmenitiesExpanded((current) => ({ ...current, [activeType]: false }));
                  }
                }}
              >
                {sec.label}
              </button>
            );
          })}
        </div>
      ) : null;

    const itemRow =
      isLodging && items.length > 1 ? (
        <div className="pnt-subtabs">
          {items.map((item, idx) => (
            <button
              key={`${activeType}-item-${idx}`}
              type="button"
              className={`pnt-subtab${idx === itemIdx ? " is-active" : ""}`}
              onClick={() => {
                setLodgingItemIndex((current) => ({ ...current, [activeType]: idx }));
                setLodgingMediaIndex((current) => ({ ...current, [activeType]: 0 }));
                setAmenitiesExpanded((current) => ({ ...current, [activeType]: false }));
              }}
            >
              {str(item.name) || `${labelBase} ${idx + 1}`}
            </button>
          ))}
        </div>
      ) : null;

    if (!sectionRow && !itemRow) return null;
    return (
      <>
        {sectionRow}
        {itemRow}
      </>
    );
  }

  /* ---------- per-tab renderers ---------- */

  function renderEmpty(text: string) {
    return <div className="pnt-empty">{text}</div>;
  }

  function renderPromoOrPrice(item: Item, budgetAware = false) {
    const promo = promoOf(item);
    if (budgetAware && isBudgetItem(item)) {
      return <span className="pnt-price">Sob orçamento</span>;
    }
    if (promo.show) {
      return (
        <span className="pnt-promo-row">
          <span className="pnt-promo-badge">PROMO</span>
          <span className="pnt-promo-now">{promo.now}</span>
          {promo.old ? <span className="pnt-promo-old">{promo.old}</span> : null}
        </span>
      );
    }
    const price = normalizePrice(item.price);
    return price ? <span className="pnt-price">{price}</span> : null;
  }

  function renderSobre() {
    if (!about) return <div className="pnt-about-card">Sem descrição ainda.</div>;
    return (
      <div className="pnt-about-card">
        {about
          .replace(/<\/?p>/g, "\n\n")
          .split(/\n{2,}/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
          .map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
      </div>
    );
  }

  function renderServices() {
    const sections = sectionsForType("servicos");
    if (!sections.length) return renderEmpty("Sem serviços definidos.");
    const activeSection = activeSectionFor("servicos", sections);
    if (!activeSection) return renderEmpty("Sem serviços definidos.");
    return (
      <div className="pnt-list">
        {activeSection.items.map((svc, idx) => {
          const name = str(svc.description && !svc.name ? svc.description : svc.name) || "Serviço";
          const time = str(svc.time);
          const typeLabel = serviceTypeLabel(svc.serviceTypeLabel || svc.serviceType);
          const note = str(svc.note || svc.notes);
          const short = str(svc.shortDescription);
          return (
            <button
              key={`svc-${activeSection.id}-${idx}`}
              type="button"
              className="pnt-service-block"
              onClick={() =>
                setItemModal({ kind: "service", item: svc, sectionLabel: activeSection.label, imageIndex: 0 })
              }
            >
              <span className="pnt-service-top">
                <span className="pnt-item-title">{name}</span>
                {renderPromoOrPrice(svc, true)}
              </span>
              {time ? <span className="pnt-item-meta">Duração: {time}{/^\d+$/.test(time) ? " min" : ""}</span> : null}
              {typeLabel && typeLabel.toLowerCase() !== "geral" ? (
                <span className="pnt-item-meta">{typeLabel}</span>
              ) : null}
              {short ? <span className="pnt-item-desc">{short}</span> : null}
              {note ? <span className="pnt-item-note">{note}</span> : null}
            </button>
          );
        })}
      </div>
    );
  }

  function renderMenuOrProducts(type: "menu" | "produtos") {
    const sections = sectionsForType(type);
    if (!sections.length) {
      return renderEmpty(type === "produtos" ? "Sem produtos definidos." : "Sem menu definido.");
    }
    const activeSection = activeSectionFor(type, sections);
    if (!activeSection) return null;
    const viewMode = viewModes[type] || "list";
    const modalKind = type === "menu" ? "menu" : "product";

    return (
      <div className="pnt-block">
        <div className="pnt-block-header">
          <h4 className="pnt-block-title">{activeSection.label}</h4>
          <div className="pnt-view-toggle">
            {(["list", "grid"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-label={mode === "list" ? "Ver em lista" : "Ver em grelha"}
                className={`pnt-view-toggle-btn${viewMode === mode ? " is-active" : ""}`}
                onClick={() => setViewModes((current) => ({ ...current, [type]: mode }))}
              >
                <Icon path={mode === "list" ? ICONS.list : ICONS.grid} size={13} />
              </button>
            ))}
          </div>
        </div>
        <div className={viewMode === "grid" ? "pnt-grid-wrap" : "pnt-list"}>
          {activeSection.items.map((item, idx) => {
            const image = itemImages(item)[0] || "";
            const name = str(item.name) || (type === "produtos" ? "Produto" : "Item");
            const desc = str(item.shortDescription || item.description);
            const open = () =>
              setItemModal({ kind: modalKind, item, sectionLabel: activeSection.label, imageIndex: 0 });
            if (viewMode === "grid") {
              return (
                <button key={`${activeSection.id}-${idx}`} type="button" className="pnt-grid-item" onClick={open}>
                  {image ? (
                    <img src={image} alt={name} className="pnt-grid-image" />
                  ) : (
                    <span className="pnt-grid-image pnt-media-fallback">
                      <Icon path={ICONS.image} size={20} color="#64748b" />
                    </span>
                  )}
                  <span className="pnt-grid-body">
                    <span className="pnt-item-title">{name}</span>
                    {desc ? <span className="pnt-item-desc pnt-clamp-2">{desc}</span> : null}
                    {renderPromoOrPrice(item)}
                  </span>
                </button>
              );
            }
            return (
              <button key={`${activeSection.id}-${idx}`} type="button" className="pnt-list-item" onClick={open}>
                {image ? (
                  <img src={image} alt={name} className="pnt-thumb" />
                ) : null}
                <span className="pnt-list-body">
                  <span className="pnt-list-top">
                    <span className="pnt-item-title">{name}</span>
                    {renderPromoOrPrice(item)}
                  </span>
                  {desc ? <span className="pnt-item-desc">{desc}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderGallery() {
    if (!photoUrls.length && !videoUrls.length) return renderEmpty("Sem fotos ou vídeos.");
    const isPhotos = galleryView === "photos";
    const items = (isPhotos ? photoUrls : videoUrls).slice(0, 24);
    if (!items.length) return renderEmpty(isPhotos ? "Sem fotos." : "Sem vídeos.");
    return (
      <div className="pnt-media-grid">
        {items.map((url, idx) =>
          isPhotos ? (
            <button
              key={`photo-${idx}`}
              type="button"
              className="pnt-media-tile"
              onClick={() => setLightbox({ items, index: idx, isVideo: false })}
            >
              <img src={url} alt={`Foto ${idx + 1}`} loading="lazy" />
            </button>
          ) : (
            <button
              key={`video-${idx}`}
              type="button"
              className="pnt-media-tile pnt-media-tile-video"
              onClick={() => setLightbox({ items, index: idx, isVideo: true })}
            >
              <span className="pnt-media-video-badge">VIDEO</span>
              <Icon path={ICONS.video} size={24} color="#fff" />
              <span className="pnt-media-video-label">{`Vídeo ${idx + 1}`}</span>
            </button>
          )
        )}
      </div>
    );
  }

  function renderSchedule() {
    const schedule = rec(profileData.schedule);
    const rows = WEEKDAYS.map(([key, label]) => ({ key, label, value: str(schedule[key]) })).filter(
      (row) => row.value
    );
    if (!rows.length) return renderEmpty("Sem horário definido.");
    return (
      <div className="pnt-list">
        {rows.map((row) => (
          <div key={row.key} className="pnt-schedule-card">
            <span className="pnt-schedule-day">{row.label}</span>
            <span className="pnt-schedule-time">
              <Icon path={ICONS.clock} size={13} color="#475569" />
              {row.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  function renderAgenda() {
    const agenda = rec(profileData.agenda);
    const slots = arr(agenda.slots).map((entry) => rec(entry)).filter((slot) => !isDisabled(slot));
    const description = str(agenda.description);
    const reserveUrl = toOpenableUrl(agenda.reserveLink);
    if (!description && !reserveUrl && !slots.length) return renderEmpty("Sem agenda definida.");
    return (
      <div className="pnt-list">
        {description ? (
          <div className="pnt-info-item">
            <Icon path={ICONS.calendar} size={14} color="#334155" />
            <span>{description}</span>
          </div>
        ) : null}
        {slots.map((slot, idx) => (
          <div key={`slot-${idx}`} className="pnt-agenda-card">
            <div className="pnt-agenda-header">
              <span className="pnt-agenda-day-row">
                <span className="pnt-agenda-day">{str(slot.weekday || slot.displayDay) || `Dia ${idx + 1}`}</span>
                {str(slot.day || slot.date) ? (
                  <span className="pnt-agenda-date">{str(slot.day || slot.date)}</span>
                ) : null}
              </span>
              <span className="pnt-agenda-status">Disponível</span>
            </div>
            <p className="pnt-agenda-times">
              {arr(slot.times).length ? arr(slot.times).map((entry) => str(entry)).join(" | ") : "-"}
            </p>
          </div>
        ))}
        {reserveUrl ? (
          <a className="pnt-reserve-btn" href={reserveUrl} target="_blank" rel="noreferrer">
            <Icon path={ICONS.calendar} size={14} color="#fff" />
            Reservar agora
          </a>
        ) : null}
      </div>
    );
  }

  function renderLocations() {
    const locations = arr(profileData.locations).map((entry) => rec(entry)).filter((loc) => !isDisabled(loc));
    if (!locations.length) return renderEmpty("Sem locais adicionados.");
    return (
      <div className="pnt-list">
        {locations.map((loc, idx) => {
          const targetUrl = mapsUrlFor(loc);
          return (
            <div key={`loc-${idx}`} className="pnt-location-card">
              <div className="pnt-location-info">
                <h4 className="pnt-block-title">{str(loc.title || loc.name) || "Local"}</h4>
                {str(loc.address) ? <p className="pnt-item-desc">{str(loc.address)}</p> : null}
                {str(loc.note) ? <p className="pnt-item-desc">{str(loc.note)}</p> : null}
              </div>
              {targetUrl ? (
                <a className="pnt-map-btn" href={targetUrl} target="_blank" rel="noreferrer">
                  <Icon path={ICONS.map} size={16} color="#334155" />
                  <span>Mapa</span>
                </a>
              ) : (
                <span className="pnt-map-btn is-disabled">
                  <Icon path={ICONS.map} size={16} color="#94a3b8" />
                  <span>Mapa</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderPartners() {
    const partners = arr(profileData.partners).map((entry) => rec(entry)).filter((p) => !isDisabled(p));
    if (!partners.length) return renderEmpty("Sem parcerias adicionadas.");
    return (
      <div className="pnt-partners-grid">
        {partners.map((partner, idx) => {
          const image = mediaList(partner.image)[0] || "";
          return (
            <div key={`partner-${idx}`} className="pnt-partner-card">
              {image ? (
                <img src={image} alt={str(partner.name) || "Parceiro"} className="pnt-partner-image" />
              ) : (
                <span className="pnt-partner-image pnt-media-fallback">
                  <Icon path={ICONS.people} size={16} color="#64748b" />
                </span>
              )}
              <span className="pnt-partner-name">{str(partner.name) || "Parceiro"}</span>
            </div>
          );
        })}
      </div>
    );
  }

  function renderPortfolio() {
    const sections = sectionsForType("portfolio");
    if (!sections.length) return renderEmpty("Sem portfolio definido.");
    const activeSection = activeSectionFor("portfolio", sections);
    if (!activeSection) return null;
    return (
      <div className="pnt-block">
        <h4 className="pnt-block-title">{activeSection.label}</h4>
        <div className="pnt-list">
          {activeSection.items.map((item, idx) => {
            const image = itemImages(item)[0] || "";
            return (
              <button
                key={`${activeSection.id}-${idx}`}
                type="button"
                className="pnt-list-item"
                onClick={() =>
                  setItemModal({ kind: "portfolio", item, sectionLabel: activeSection.label, imageIndex: 0 })
                }
              >
                {image ? <img src={image} alt={str(item.name) || "Projeto"} className="pnt-thumb" /> : null}
                <span className="pnt-list-body">
                  <span className="pnt-item-title">{str(item.name) || "Projeto"}</span>
                  {str(item.description) ? (
                    <span className="pnt-item-desc">{str(item.description)}</span>
                  ) : null}
                  {str(item.link) ? <span className="pnt-item-meta pnt-truncate">{str(item.link)}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderCampaigns() {
    const direct = arr(profileData.campaigns).map((entry) => rec(entry));
    const fromSections = [
      ...arr(profileData.campaignSections),
      ...arr(profileData.campaignsSections)
    ].flatMap((entry) => arr(rec(entry).items).map((item) => rec(item)));
    const items = (direct.length ? direct : fromSections).filter(
      (item) => !isDisabled(item) && (str(item.title || item.name) || itemImages(item).length)
    );
    if (!items.length) return renderEmpty("Sem campanhas definidas.");
    return (
      <div className="pnt-campaign-grid">
        {items.map((item, idx) => {
          const image = itemImages(item)[0] || "";
          const videos = mediaList(item.videos || item.video || item.videoUrl);
          const badge = str(item.badge || item.tag);
          return (
            <button
              key={`campaign-${idx}`}
              type="button"
              className="pnt-campaign-card"
              onClick={() =>
                setItemModal({ kind: "campaign", item, sectionLabel: "Campanhas", imageIndex: 0 })
              }
            >
              <span className="pnt-campaign-media">
                {image ? (
                  <img src={image} alt={str(item.title || item.name) || "Campanha"} />
                ) : videos.length ? (
                  <span className="pnt-campaign-video-tile">
                    <Icon path={ICONS.video} size={20} color="#fff" />
                    <span>Vídeo</span>
                  </span>
                ) : (
                  <span className="pnt-campaign-video-tile">
                    <Icon path={ICONS.image} size={20} color="#fff" />
                  </span>
                )}
                {badge ? <span className="pnt-campaign-badge">{badge}</span> : null}
              </span>
              <span className="pnt-campaign-title">{str(item.title || item.name) || `Campanha ${idx + 1}`}</span>
            </button>
          );
        })}
      </div>
    );
  }

  function renderLodging(type: "casas" | "quartos") {
    const sections = sectionsForType(type);
    if (!sections.length) {
      return renderEmpty(type === "casas" ? "Sem casas definidas." : "Sem quartos definidos.");
    }
    const activeSection = activeSectionFor(type, sections);
    const items = activeSection?.items || [];
    if (!items.length) {
      return renderEmpty(type === "casas" ? "Sem casas definidas." : "Sem quartos definidos.");
    }
    const itemIdx = Math.max(0, Math.min(lodgingItemIndex[type] || 0, items.length - 1));
    const item = items[itemIdx];
    const labelBase = type === "casas" ? "Casa" : "Quarto";
    const itemLabel = str(item.name) || `${labelBase} ${itemIdx + 1}`;

    const images = uniqueList([...itemImages(item), ...photoUrls]).slice(0, 20);
    const mediaIdx = Math.max(0, Math.min(lodgingMediaIndex[type] || 0, Math.max(0, images.length - 1)));
    const mainImage = images[mediaIdx] || "";

    const priceNight = normalizePrice(item.priceNight);
    const promo = promoOf(item);
    const amenities = arr(item.amenities).length
      ? arr(item.amenities).map((entry) => str(entry)).filter(Boolean)
      : str(item.amenities)
          .split(/[,\n;]+/g)
          .map((entry) => entry.trim())
          .filter(Boolean);
    const expanded = !!amenitiesExpanded[type];
    const visibleAmenities = expanded ? amenities : amenities.slice(0, 8);
    const hasMoreAmenities = amenities.length > visibleAmenities.length;

    const facts = [
      { key: "capacity", icon: ICONS.people, label: "Capacidade", value: str(item.capacity) },
      { key: "beds", icon: ICONS.bed, label: "Camas", value: str(item.beds) },
      { key: "bathrooms", icon: ICONS.drop, label: "WC", value: str(item.bathrooms) }
    ].filter((row) => row.value);
    const stayInfo = [
      { key: "availability", icon: ICONS.check, label: "Disponibilidade", value: str(item.availability) },
      { key: "checkIn", icon: ICONS.login, label: "Check-in", value: str(item.checkIn) },
      { key: "checkOut", icon: ICONS.logout, label: "Check-out", value: str(item.checkOut) }
    ].filter((row) => row.value);
    const rules = arr(item.houseRules).length
      ? arr(item.houseRules).map((entry) => str(entry)).filter(Boolean)
      : str(item.houseRules)
          .split(/[,\n;]+/g)
          .map((entry) => entry.trim())
          .filter(Boolean);

    return (
      <div className="pnt-block">
        <div className="pnt-lodging-header">
          <h4 className="pnt-block-title pnt-truncate">{itemLabel}</h4>
          {promo.show ? (
            <span className="pnt-promo-row">
              <span className="pnt-promo-badge">PROMO</span>
              <span className="pnt-promo-now">{promo.now}</span>
              {promo.old ? <span className="pnt-promo-old">{promo.old}</span> : null}
            </span>
          ) : priceNight ? (
            <span className="pnt-lodging-price">
              <Icon path={ICONS.tag} size={11} color="#9a3412" />
              {priceNight}
              {!/noite/i.test(priceNight) ? <span className="pnt-lodging-price-suffix">/noite</span> : null}
            </span>
          ) : null}
        </div>

        <div className="pnt-lodging-media">
          {mainImage ? (
            <button
              type="button"
              className="pnt-lodging-main-press"
              onClick={() => setLightbox({ items: images, index: mediaIdx, isVideo: false })}
            >
              <img src={mainImage} alt={itemLabel} className="pnt-lodging-main-image" />
            </button>
          ) : (
            <div className="pnt-lodging-main-image pnt-media-fallback">
              <Icon path={ICONS.image} size={22} color="#64748b" />
            </div>
          )}
          {images.length > 1 ? (
            <div className="pnt-lodging-thumbs">
              {images.map((uri, idx) => (
                <button
                  key={`thumb-${idx}`}
                  type="button"
                  className={`pnt-lodging-thumb${idx === mediaIdx ? " is-active" : ""}`}
                  onClick={() => setLodgingMediaIndex((current) => ({ ...current, [type]: idx }))}
                >
                  <img src={uri} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {str(item.description) ? <p className="pnt-lodging-desc">{str(item.description)}</p> : null}

        {facts.length ? (
          <div className="pnt-facts-card">
            {facts.map((row) => (
              <div key={row.key} className="pnt-fact-row">
                <span className="pnt-fact-left">
                  <Icon path={row.icon} size={14} color="#334155" />
                  {row.label}
                </span>
                <span className="pnt-fact-value">{row.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        {stayInfo.length ? (
          <div className="pnt-facts-card">
            {stayInfo.map((row) => (
              <div key={row.key} className="pnt-fact-row">
                <span className="pnt-fact-left">
                  <Icon path={row.icon} size={14} color="#334155" />
                  {row.label}
                </span>
                <span className="pnt-fact-value">{row.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        {rules.length ? (
          <>
            <h5 className="pnt-section-subtitle">Regras</h5>
            <p className="pnt-item-desc">{rules.join(" • ")}</p>
          </>
        ) : null}

        {amenities.length ? (
          <>
            <h5 className="pnt-section-subtitle">Comodidades</h5>
            <div className="pnt-amenities">
              {visibleAmenities.map((entry, idx) => (
                <span key={`amenity-${idx}`} className="pnt-amenity-chip">
                  {entry}
                </span>
              ))}
            </div>
            {hasMoreAmenities || expanded ? (
              <button
                type="button"
                className="pnt-more-btn"
                onClick={() => setAmenitiesExpanded((current) => ({ ...current, [type]: !expanded }))}
              >
                {expanded ? "Ver menos" : `Ver mais (${amenities.length})`}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  function renderTabContent() {
    if (!activeTab) return renderEmpty("Sem abas ativas.");
    if (activeType === "sobre") return renderSobre();
    if (activeType === "galeria" || activeType === "fotos") return renderGallery();
    if (activeType === "servicos") return renderServices();
    if (activeType === "menu") return renderMenuOrProducts("menu");
    if (activeType === "produtos") return renderMenuOrProducts("produtos");
    if (activeType === "campanhas" || activeType === "campanha") return renderCampaigns();
    if (activeType === "horario") return renderSchedule();
    if (activeType === "agenda") return renderAgenda();
    if (activeType === "locais" || activeType === "localizacao") return renderLocations();
    if (activeType === "parcerias") return renderPartners();
    if (activeType === "portfolio" || activeType === "portofolio") return renderPortfolio();
    if (activeType === "casas" || activeType === "quartos") return renderLodging(activeType as "casas" | "quartos");
    return renderEmpty("Sem conteúdo nesta aba.");
  }

  /* ---------- item modal ---------- */

  function renderItemModal() {
    if (!itemModal) return null;
    const { kind, item, sectionLabel } = itemModal;
    const images = itemImages(item);
    const imageIdx = Math.max(0, Math.min(itemModal.imageIndex, Math.max(0, images.length - 1)));
    const showImage = boolLike(item.modalImageEnabled ?? item.showImageInModal, images.length > 0);
    const title =
      kind === "service"
        ? str(item.description && !item.name ? item.description : item.name) || "Serviço"
        : str(item.name || item.title) ||
          (kind === "menu" ? "Item do menu" : kind === "portfolio" ? "Projeto" : kind === "campaign" ? "Campanha" : "Produto");
    const longDescription = str(item.fullDescription || item.description || item.shortDescription);
    const promo = promoOf(item);
    const budget = kind === "service" && isBudgetItem(item);
    const price = normalizePrice(item.price);
    const link = toOpenableUrl(item.link);
    const videos = kind === "campaign" ? mediaList(item.videos || item.video || item.videoUrl) : [];

    const metaRows: Array<{ label: string; value: string }> = [];
    if (kind === "service") {
      const typeLabel = serviceTypeLabel(item.serviceTypeLabel || item.serviceType);
      if (str(item.time)) metaRows.push({ label: "Duração", value: `${str(item.time)}${/^\d+$/.test(str(item.time)) ? " min" : ""}` });
      if (typeLabel && typeLabel.toLowerCase() !== "geral") metaRows.push({ label: "Tipo", value: typeLabel });
      if (str(item.extra1 || item.detail1)) metaRows.push({ label: "Detalhe", value: str(item.extra1 || item.detail1) });
      if (str(item.extra2 || item.detail2)) metaRows.push({ label: "Detalhe", value: str(item.extra2 || item.detail2) });
      if (str(item.note || item.notes)) metaRows.push({ label: "Nota", value: str(item.note || item.notes) });
    }
    if (kind === "product" || kind === "menu") {
      if (str(item.sku)) metaRows.push({ label: "SKU", value: str(item.sku) });
      if (str(item.stock)) {
        metaRows.push({ label: "Stock", value: str(item.stock).toLowerCase() === "out" ? "Esgotado" : "Em stock" });
      }
      if (str(item.size)) metaRows.push({ label: "Tamanho", value: str(item.size) });
      if (str(item.usage)) metaRows.push({ label: "Como usar", value: str(item.usage) });
      if (str(item.ingredients)) metaRows.push({ label: "Materiais", value: str(item.ingredients) });
    }
    metaRows.push(...extraFieldRows(item));

    return (
      <div className="pnt-modal-backdrop" onClick={() => setItemModal(null)}>
        <div className="pnt-modal-panel" role="dialog" aria-label={title} onClick={(event) => event.stopPropagation()}>
          <div className="pnt-modal-header">
            <div className="pnt-modal-heading">
              {sectionLabel ? <span className="pnt-modal-section">{sectionLabel}</span> : null}
              <h4 className="pnt-modal-title">{title}</h4>
            </div>
            <div className="pnt-modal-actions">
              {canInteract ? (
                <>
                  <ShareButton
                    profileId={profileId}
                    profileSlug={profileSlug}
                    profileName={profileName}
                    subject="item"
                    className="pnt-icon-btn"
                    contentUri={buildItemShareUri({
                      kind: kind === "product" ? "product" : kind,
                      section: sectionLabel,
                      name: title,
                      price: promo.show ? promo.now : price,
                      oldPrice: promo.old,
                      time: str(item.time),
                      note: longDescription,
                      image: images[0] || ""
                    })}
                  />
                  <SaveEntryButton
                    kind="item"
                    subject="item"
                    entryKey={itemEntryKey(profileSlug, kind, sectionLabel, title)}
                    initialSaved={savedKeys.has(itemEntryKey(profileSlug, kind, sectionLabel, title))}
                    data={{
                      kind,
                      section: sectionLabel,
                      name: title,
                      note: longDescription,
                      price: promo.show ? promo.now : price,
                      oldPrice: promo.old,
                      image: images[0] || "",
                      profileName,
                      profileSlug
                    }}
                  />
                </>
              ) : null}
              <button type="button" className="pnt-modal-close" aria-label="Fechar" onClick={() => setItemModal(null)}>
                <Icon path={ICONS.close} size={15} color="#fff" />
              </button>
            </div>
          </div>

          {showImage && images.length ? (
            <div className="pnt-modal-media">
              <img src={images[imageIdx]} alt={title} className="pnt-modal-image" />
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="pnt-media-nav pnt-media-nav-left"
                    aria-label="Imagem anterior"
                    onClick={() =>
                      setItemModal((current) =>
                        current
                          ? { ...current, imageIndex: (imageIdx - 1 + images.length) % images.length }
                          : current
                      )
                    }
                  >
                    <Icon path={ICONS.chevronLeft} size={16} color="#fff" />
                  </button>
                  <button
                    type="button"
                    className="pnt-media-nav pnt-media-nav-right"
                    aria-label="Imagem seguinte"
                    onClick={() =>
                      setItemModal((current) =>
                        current ? { ...current, imageIndex: (imageIdx + 1) % images.length } : current
                      )
                    }
                  >
                    <Icon path={ICONS.chevronRight} size={16} color="#fff" />
                  </button>
                  <span className="pnt-media-dots">
                    {images.map((_, idx) => (
                      <span key={idx} className={`pnt-media-dot${idx === imageIdx ? " is-active" : ""}`} />
                    ))}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="pnt-modal-body">
            {budget ? (
              <p className="pnt-price">Sob orçamento</p>
            ) : promo.show ? (
              <p className="pnt-promo-row">
                <span className="pnt-promo-badge">PROMO</span>
                <span className="pnt-promo-now">{promo.now}</span>
                {promo.old ? <span className="pnt-promo-old">{promo.old}</span> : null}
              </p>
            ) : price ? (
              <p className="pnt-modal-price">{price}</p>
            ) : null}

            {longDescription ? <p className="pnt-modal-desc">{longDescription}</p> : null}

            {videos.length
              ? videos.map((uri, idx) => (
                  <video key={`campaign-video-${idx}`} className="pnt-modal-video" controls preload="metadata" src={uri} />
                ))
              : null}

            {metaRows.length ? (
              <div className="pnt-modal-meta">
                {metaRows.map((row, idx) => (
                  <div key={`meta-${idx}`} className="pnt-fact-row">
                    <span className="pnt-fact-left">{row.label}</span>
                    <span className="pnt-fact-value">{row.value}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {kind === "portfolio" && link ? (
              <a className="pnt-reserve-btn" href={link} target="_blank" rel="noreferrer">
                <Icon path={ICONS.link} size={14} color="#fff" />
                Abrir projeto
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- gallery lightbox ---------- */

  function renderLightbox() {
    if (!lightbox) return null;
    const { items, index, isVideo } = lightbox;
    const total = Math.max(1, items.length);
    const safeIndex = Math.max(0, Math.min(index, total - 1));
    const current = items[safeIndex];
    const legend = `${isVideo ? "Vídeo" : "Foto"} ${safeIndex + 1}/${total}`;
    return (
      <div className="pnt-lightbox-backdrop" onClick={() => setLightbox(null)}>
        <div className="pnt-lightbox-actions" onClick={(event) => event.stopPropagation()}>
          {canInteract ? (
            <>
              <ShareButton
                profileId={profileId}
                profileSlug={profileSlug}
                profileName={profileName}
                subject={isVideo ? "vídeo" : "foto"}
                className="pnt-lightbox-btn"
                contentType={isVideo ? "video" : "photo"}
                contentUri={current}
              />
              <SaveEntryButton
                kind="media"
                subject={isVideo ? "vídeo" : "foto"}
                className="pnt-lightbox-btn"
                entryKey={mediaEntryKey(profileSlug, current)}
                initialSaved={savedKeys.has(mediaEntryKey(profileSlug, current))}
                data={{
                  type: isVideo ? "video" : "photo",
                  uri: current,
                  profileName,
                  profileSlug
                }}
              />
            </>
          ) : null}
          <button type="button" className="pnt-lightbox-btn" aria-label="Fechar" onClick={() => setLightbox(null)}>
            <Icon path={ICONS.close} size={18} color="#fff" />
          </button>
        </div>
        <div className="pnt-lightbox-stage" onClick={(event) => event.stopPropagation()}>
          {isVideo ? (
            <video key={current} className="pnt-lightbox-media" controls autoPlay src={current} />
          ) : (
            <img key={current} className="pnt-lightbox-media" src={current} alt={legend} />
          )}
          {total > 1 ? (
            <>
              <button
                type="button"
                className="pnt-media-nav pnt-media-nav-left"
                aria-label="Anterior"
                onClick={() =>
                  setLightbox((current) =>
                    current ? { ...current, index: (safeIndex - 1 + total) % total } : current
                  )
                }
              >
                <Icon path={ICONS.chevronLeft} size={20} color="#fff" />
              </button>
              <button
                type="button"
                className="pnt-media-nav pnt-media-nav-right"
                aria-label="Seguinte"
                onClick={() =>
                  setLightbox((current) => (current ? { ...current, index: (safeIndex + 1) % total } : current))
                }
              >
                <Icon path={ICONS.chevronRight} size={20} color="#fff" />
              </button>
            </>
          ) : null}
          <span className="pnt-lightbox-legend">{legend}</span>
        </div>
      </div>
    );
  }

  /* ---------- render ---------- */

  return (
    <>
      <div className="pnt-tabs-sticky">
        <div className="pnt-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`pnt-tab${tab.id === activeTabId ? " is-active" : ""}`}
              onClick={() => switchTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {renderSubtabs()}
      </div>

      <div className="pnt-panel">{renderTabContent()}</div>

      {renderItemModal()}
      {renderLightbox()}
    </>
  );
}

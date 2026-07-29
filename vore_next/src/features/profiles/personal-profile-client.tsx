"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SharesTab } from "@/features/recommendations/shares-tab";
import { ITEM_KIND_LABELS } from "@/features/recommendations/shared";
import type { PermissionRequest, ShareConversation } from "@/features/recommendations/shared";
import type { SavedItemEntry, SavedMediaEntry } from "@/features/saved/entries";
import type { ProfileRow } from "@/features/vore-shell/queries";
import { getBadgeType, getCardDisplayData, resolveProfileFilter } from "@/features/vore-shell/display";

const RECENT_STORAGE_KEY = "vore:recent-profiles";
const PAGE_SIZE = 18;

const ALERT_OPTIONS = [
  { key: "newProfiles", label: "Novos perfis" },
  { key: "promos", label: "Promoções" },
  { key: "nearby", label: "Perto de mim" }
] as const;

type AlertKey = (typeof ALERT_OPTIONS)[number]["key"];

function MiniCard({ profile }: { profile: ProfileRow }) {
  const card = getCardDisplayData(profile);
  return (
    <Link href={`/profile/${profile.slug}`} className="card card-compact">
      <div className="card-avatar-wrap">
        {card.avatar ? (
          <img src={card.avatar} alt={profile.name} className="card-avatar" />
        ) : (
          <div className="card-avatar placeholder">{profile.name.slice(0, 1).toUpperCase()}</div>
        )}
        {card.verified ? <span className="card-avatar-verif">{"✓"}</span> : null}
      </div>
      <div className="card-name-row">
        <h3>{profile.name}</h3>
      </div>
      <p className="card-category">{card.category}</p>
      <p className="muted">{card.location}</p>
    </Link>
  );
}

function EmptyState({ text, ctaLabel }: { text: string; ctaLabel?: string }) {
  return (
    <div className="pnt-empty ppf-empty">
      <p>{text}</p>
      {ctaLabel ? (
        <Link href="/explore" className="ppf-empty-cta">
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function PersonalProfileClient({
  name,
  email,
  savedProfiles,
  profiles,
  conversations,
  permissionRequests,
  savedMedia,
  savedItems
}: {
  name: string;
  email: string;
  savedProfiles: ProfileRow[];
  profiles: ProfileRow[];
  conversations: ShareConversation[];
  permissionRequests: PermissionRequest[];
  savedMedia: SavedMediaEntry[];
  savedItems: SavedItemEntry[];
}) {
  const [tab, setTab] = useState<"shares" | "saved" | "recent" | "alerts">("saved");
  const [savedSubTab, setSavedSubTab] = useState<"profiles" | "media" | "items">("profiles");
  const [mediaPreview, setMediaPreview] = useState<SavedMediaEntry | null>(null);
  const [savedQuery, setSavedQuery] = useState("");
  const [savedLimit, setSavedLimit] = useState(PAGE_SIZE);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<Record<AlertKey, boolean>>({
    newProfiles: true,
    promos: true,
    nearby: false
  });

  // Recently viewed lives client-side: the web has no server-side view log,
  // and the profile page appends to this same key.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(parsed)) {
        setRecentIds(parsed.map((entry) => String(entry || "")).filter(Boolean));
      }
    } catch {
      setRecentIds([]);
    }
  }, []);

  useEffect(() => {
    setSavedLimit(PAGE_SIZE);
  }, [savedQuery]);

  const filteredSaved = useMemo(() => {
    const query = savedQuery.trim().toLowerCase();
    if (!query) return savedProfiles;
    return savedProfiles.filter((profile) => {
      const card = getCardDisplayData(profile);
      return `${profile.name} ${card.category} ${card.location}`.toLowerCase().includes(query);
    });
  }, [savedProfiles, savedQuery]);

  const visibleSaved = filteredSaved.slice(0, savedLimit);

  const recentProfiles = useMemo(() => {
    const byId = new Map(profiles.map((profile) => [profile.id, profile]));
    return recentIds.map((id) => byId.get(id)).filter((p): p is ProfileRow => !!p);
  }, [recentIds, profiles]);

  const alertLists = useMemo(
    () => ({
      newProfiles: profiles
        .filter((p) => getBadgeType(p) === "novo" || resolveProfileFilter(p) === "novidades")
        .slice(0, 8),
      promos: profiles
        .filter((p) => getBadgeType(p) === "promo" || resolveProfileFilter(p) === "promocoes")
        .slice(0, 8),
      nearby: (() => {
        const near = profiles.filter((p) => resolveProfileFilter(p) === "perto");
        return (near.length ? near : profiles).slice(0, 8);
      })()
    }),
    [profiles]
  );

  return (
    <section className="ppf-screen">
      <div className="ppf-header">
        <div className="ppf-avatar">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="8" r="3.75" stroke="#475569" strokeWidth="1.8" />
            <path d="M5.25 19.5a6.75 6.75 0 0 1 13.5 0" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="ppf-name">{name || "Conta Pessoal"}</h1>
        <p className="ppf-email">{email}</p>
      </div>

      <div className="pnt-tabs ppf-tabs">
        {(
          [
            ["shares", "Partilhas"],
            ["saved", "Guardados"],
            ["recent", "Recentes"],
            ["alerts", "Sugestões"]
          ] as const
        ).map(([key, label]) => {
          const badge = key === "shares" ? permissionRequests.length : 0;
          return (
            <button
              key={key}
              type="button"
              className={`pnt-tab${tab === key ? " is-active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
              {badge ? <span className="ppf-tab-badge">{badge}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="pnt-panel">
        {tab === "shares" ? (
          <SharesTab conversations={conversations} requests={permissionRequests} />
        ) : null}

        {tab === "saved" ? (
          <>
            <div className="pnt-subtabs ppf-saved-subtabs">
              {(
                [
                  ["profiles", "Perfis", savedProfiles.length],
                  ["media", "Fotos e vídeos", savedMedia.length],
                  ["items", "Itens", savedItems.length]
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  className={`pnt-subtab${savedSubTab === key ? " is-active" : ""}`}
                  onClick={() => setSavedSubTab(key)}
                >
                  {label}
                  {count ? <span className="ppf-subtab-count">{count}</span> : null}
                </button>
              ))}
            </div>

            {savedSubTab === "profiles" ? (
              !savedProfiles.length ? (
                <EmptyState text="Ainda não guardaste perfis." ctaLabel="Descobrir perfis" />
              ) : (
                <>
                  <input
                    className="input ppf-search"
                    placeholder="Pesquisar perfis guardados..."
                    value={savedQuery}
                    onChange={(event) => setSavedQuery(event.target.value)}
                  />
                  {!filteredSaved.length ? (
                    <p className="muted ppf-hint">Nenhum perfil encontrado.</p>
                  ) : (
                    <>
                      <div className="grid">
                        {visibleSaved.map((profile) => (
                          <MiniCard key={`saved-${profile.id}`} profile={profile} />
                        ))}
                      </div>
                      {visibleSaved.length < filteredSaved.length ? (
                        <div className="vore-load-more-row">
                          <span className="muted">
                            A mostrar {visibleSaved.length} de {filteredSaved.length}
                          </span>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setSavedLimit((count) => count + PAGE_SIZE)}
                          >
                            Mostrar mais
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </>
              )
            ) : null}

            {savedSubTab === "media" ? (
              !savedMedia.length ? (
                <EmptyState text="Ainda não guardaste fotos nem vídeos." ctaLabel="Descobrir perfis" />
              ) : (
                <div className="pnt-media-grid">
                  {savedMedia.map((entry) => (
                    <button
                      key={entry.key}
                      type="button"
                      className={`pnt-media-tile${entry.type === "video" ? " pnt-media-tile-video" : ""}`}
                      onClick={() => setMediaPreview(entry)}
                    >
                      {entry.type === "video" ? (
                        <>
                          <span className="pnt-media-video-badge">VIDEO</span>
                          <span className="pnt-media-video-label">{entry.profileName || "Vídeo"}</span>
                        </>
                      ) : (
                        <img src={entry.uri} alt={entry.profileName || "Foto guardada"} loading="lazy" />
                      )}
                    </button>
                  ))}
                </div>
              )
            ) : null}

            {savedSubTab === "items" ? (
              !savedItems.length ? (
                <EmptyState text="Ainda não guardaste itens." ctaLabel="Descobrir perfis" />
              ) : (
                <div className="pnt-list">
                  {savedItems.map((entry) => {
                    const body = (
                      <>
                        {entry.image ? (
                          <img src={entry.image} alt="" className="pnt-thumb shr-entry-thumb" />
                        ) : null}
                        <span className="shr-entry-main">
                          <span className="shr-entry-kind">
                            {ITEM_KIND_LABELS[entry.kind] || "Item"}
                            {entry.section ? ` · ${entry.section}` : ""}
                          </span>
                          <span className="shr-entry-title">{entry.name || "Item"}</span>
                          {entry.profileName ? (
                            <span className="shr-entry-sub">em {entry.profileName}</span>
                          ) : null}
                          {entry.price ? (
                            <span className="pnt-promo-row">
                              <span className="pnt-promo-now">{entry.price}</span>
                              {entry.oldPrice ? (
                                <span className="pnt-promo-old">{entry.oldPrice}</span>
                              ) : null}
                            </span>
                          ) : null}
                        </span>
                      </>
                    );
                    return entry.profileSlug ? (
                      <Link key={entry.key} href={`/profile/${entry.profileSlug}`} className="shr-entry">
                        {body}
                      </Link>
                    ) : (
                      <div key={entry.key} className="shr-entry is-expired">
                        {body}
                      </div>
                    );
                  })}
                </div>
              )
            ) : null}
          </>
        ) : null}

        {tab === "recent" ? (
          !recentProfiles.length ? (
            <EmptyState
              text="Ainda não visitaste nenhum perfil."
              ctaLabel="Explorar"
            />
          ) : (
            <div className="grid">
              {recentProfiles.map((profile) => (
                <MiniCard key={`recent-${profile.id}`} profile={profile} />
              ))}
            </div>
          )
        ) : null}

        {tab === "alerts" ? (
          <div className="ppf-alerts">
            {ALERT_OPTIONS.map((option) => {
              const list = alertLists[option.key];
              const enabled = alerts[option.key];
              return (
                <div key={option.key} className="ppf-alert-block">
                  <div className="ppf-alert-head">
                    <span className="ppf-alert-title">{option.label}</span>
                    <div className="ppf-alert-right">
                      <span className="muted ppf-alert-count">{list.length}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={`${option.label}: ${enabled ? "ativado" : "desativado"}`}
                        className={`ppf-switch${enabled ? " is-on" : ""}`}
                        onClick={() =>
                          setAlerts((current) => ({ ...current, [option.key]: !current[option.key] }))
                        }
                      >
                        <span className="ppf-switch-knob" />
                      </button>
                    </div>
                  </div>
                  {!enabled ? (
                    <p className="muted ppf-hint">Alerta desativado.</p>
                  ) : !list.length ? (
                    <p className="muted ppf-hint">Sem perfis nesta categoria.</p>
                  ) : (
                    <div className="ppf-alert-strip">
                      {list.map((profile) => (
                        <MiniCard key={`${option.key}-${profile.id}`} profile={profile} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {mediaPreview ? (
        <div className="pnt-lightbox-backdrop" onClick={() => setMediaPreview(null)}>
          <div className="pnt-lightbox-actions" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="pnt-lightbox-btn"
              aria-label="Fechar"
              onClick={() => setMediaPreview(null)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="pnt-lightbox-stage" onClick={(event) => event.stopPropagation()}>
            {mediaPreview.type === "video" ? (
              <video className="pnt-lightbox-media" src={mediaPreview.uri} controls autoPlay />
            ) : (
              <img className="pnt-lightbox-media" src={mediaPreview.uri} alt={mediaPreview.profileName} />
            )}
            <span className="pnt-lightbox-legend">
              {mediaPreview.profileSlug ? (
                <Link href={`/profile/${mediaPreview.profileSlug}`} className="ppf-preview-link">
                  {mediaPreview.profileName || "Ver perfil"}
                </Link>
              ) : (
                mediaPreview.profileName
              )}
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}

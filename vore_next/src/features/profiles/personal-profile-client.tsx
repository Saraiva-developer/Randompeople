"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  profiles
}: {
  name: string;
  email: string;
  savedProfiles: ProfileRow[];
  profiles: ProfileRow[];
}) {
  const [tab, setTab] = useState<"saved" | "recent" | "alerts">("saved");
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
            ["saved", "Guardados"],
            ["recent", "Recentes"],
            ["alerts", "Sugestões"]
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`pnt-tab${tab === key ? " is-active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="pnt-panel">
        {tab === "saved" ? (
          !savedProfiles.length ? (
            <EmptyState
              text="Ainda não guardaste perfis."
              ctaLabel="Descobrir perfis"
            />
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
    </section>
  );
}

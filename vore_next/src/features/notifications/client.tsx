"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import type { ProfileRow } from "@/features/vore-shell/display";
import { getBadgeType, resolveProfileFilter } from "@/features/vore-shell/display";

type NotificationFilter = "all" | "shares" | "new" | "promo";
type NotificationBucket = "today" | "yesterday" | "older";

type StoredShare = {
  id?: string | number;
  title?: string;
  fromName?: string;
  fromEmail?: string;
  createdAt?: string | number;
  read?: boolean;
  profileSlug?: string;
  profileName?: string;
};

type NotificationsUser = {
  id: string;
  email?: string | null;
};

type NotificationEntry = {
  key: string;
  category: Exclude<NotificationFilter, "all">;
  title: string;
  subtitle: string;
  time: number;
  read: boolean;
  href?: Route;
};

const FILTERS: Array<{ key: NotificationFilter; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "shares", label: "Partilhas" },
  { key: "new", label: "Novos perfis" },
  { key: "promo", label: "Promocoes" }
];

function toTimestampMs(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatRelativeTime(value: number) {
  if (!value) return "";
  const diff = Date.now() - value;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Agora";
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))} min`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))} h`;
  if (diff < 7 * day) return `${Math.max(1, Math.floor(diff / day))} d`;

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function categoryLabel(category: NotificationEntry["category"]) {
  if (category === "shares") return "Partilha";
  if (category === "new") return "Novo";
  return "Promocao";
}

function bucketFor(value: number): NotificationBucket {
  if (!value) return "older";

  const now = new Date();
  const target = new Date(value);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();
  const diffDays = Math.floor((startToday - startTarget) / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  return "older";
}

function bucketLabel(bucket: NotificationBucket) {
  if (bucket === "today") return "Hoje";
  if (bucket === "yesterday") return "Ontem";
  return "Anteriores";
}

function readJsonValue<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function getShareStorageKeys(userId: string) {
  return [
    `vore_share_inbox_${userId}`,
    `vore_personal_${userId}`,
    `vore_personal_next_${userId}`
  ];
}

function loadStoredShares(userId: string) {
  const shares: StoredShare[] = [];

  getShareStorageKeys(userId).forEach((key) => {
    const value = readJsonValue<StoredShare[] | { shareInbox?: StoredShare[] }>(key);
    if (Array.isArray(value)) shares.push(...value);
    else if (value && Array.isArray(value.shareInbox)) shares.push(...value.shareInbox);
  });

  return shares;
}

function buildProfileNotifications(profiles: ProfileRow[], readKeys: string[]) {
  const now = Date.now();
  const entries: NotificationEntry[] = [];

  profiles.forEach((profile, index) => {
    const badge = getBadgeType(profile);
    const filter = resolveProfileFilter(profile);
    const time =
      toTimestampMs(profile.updated_at) ||
      toTimestampMs(profile.created_at) ||
      now - index * 1000;

    if (badge === "novo" || filter === "novidades") {
      const key = `new_profile_${profile.id}`;
      entries.push({
        key,
        category: "new",
        title: "Novo perfil",
        subtitle: profile.name,
        time,
        read: readKeys.includes(key),
          href: `/profile/${profile.slug}` as Route
      });
    }

    if (badge === "promo" || filter === "promocoes") {
      const key = `promo_profile_${profile.id}`;
      entries.push({
        key,
        category: "promo",
        title: "Promocao ativa",
        subtitle: profile.name,
        time,
        read: readKeys.includes(key),
        href: `/profile/${profile.slug}` as Route
      });
    }
  });

  return entries;
}

export function NotificationsClient({
  user,
  profiles
}: {
  user: NotificationsUser | null;
  profiles: ProfileRow[];
}) {
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [readKeys, setReadKeys] = useState<string[]>([]);
  const [shares, setShares] = useState<StoredShare[]>([]);

  const storageKey = user ? `vore_notifications_next_${user.id}` : "";

  useEffect(() => {
    if (!user || !storageKey) return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : { readKeys: [] };
      setReadKeys(
        Array.from(
          new Set(
            (Array.isArray(parsed.readKeys) ? parsed.readKeys : [])
              .map((value: unknown) => String(value || ""))
              .filter(Boolean)
          )
        )
      );
    } catch {
      setReadKeys([]);
    }

    setShares(loadStoredShares(user.id));
  }, [storageKey, user]);

  useEffect(() => {
    if (!user || !storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ readKeys: readKeys.slice(0, 2000) }));
  }, [readKeys, storageKey, user]);

  const entries = useMemo(() => {
    if (!user) return [];

    const shareEntries = shares
      .map((share, index): NotificationEntry | null => {
        const id = String(share.id || `local_${index}`);
        const key = `share_${id}`;
        const time = toTimestampMs(share.createdAt) || Date.now() - index * 1000;
        const fromName = String(share.fromName || share.fromEmail || "Utilizador");
        const profileSlug = String(share.profileSlug || "").trim();

        return {
          key,
          category: "shares",
          title: `Partilha de ${fromName}`,
          subtitle: String(share.title || share.profileName || "Partilha"),
          time,
          read: readKeys.includes(key) || share.read === true,
          href: profileSlug ? (`/profile/${profileSlug}` as Route) : undefined
        };
      })
      .filter(Boolean) as NotificationEntry[];

    return [...shareEntries, ...buildProfileNotifications(profiles, readKeys)]
      .sort((a, b) => b.time - a.time)
      .slice(0, 160);
  }, [profiles, readKeys, shares, user]);

  const visibleEntries =
    activeFilter === "all"
      ? entries
      : entries.filter((entry) => entry.category === activeFilter);

  const unreadCount = entries.filter((entry) => !entry.read).length;

  const groups = (["today", "yesterday", "older"] as NotificationBucket[])
    .map((bucket) => ({
      bucket,
      label: bucketLabel(bucket),
      items: visibleEntries.filter((entry) => bucketFor(entry.time) === bucket)
    }))
    .filter((group) => group.items.length > 0);

  function markRead(keys: string[]) {
    setReadKeys((current) => Array.from(new Set([...keys, ...current])).slice(0, 2000));
  }

  if (!user) {
    return (
      <section>
        <div className="vore-section-heading">
          <h2>Notificacoes</h2>
          <p>Entra na tua conta para ver partilhas, perfis novos e promocoes.</p>
        </div>
        <div className="vore-panel">
          <p className="muted">Entra para ver notificacoes.</p>
          <Link className="btn primary" href="/login">
            Entrar
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="vore-section-heading notifications-heading">
        <div>
          <h2>Notificacoes</h2>
          <p>
            {unreadCount > 0
              ? `${unreadCount} por ler`
              : "Tudo em dia"}
          </p>
        </div>
        <button
          className="btn ghost"
          type="button"
          onClick={() => markRead(visibleEntries.map((entry) => entry.key))}
          disabled={!visibleEntries.some((entry) => !entry.read)}
        >
          Marcar tudo lido
        </button>
      </div>

      <div className="chips notifications-filter-row">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            className={activeFilter === filter.key ? "active" : ""}
            type="button"
            onClick={() => setActiveFilter(filter.key)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="vore-panel notifications-panel">
        {!visibleEntries.length ? (
          <p className="muted">Sem notificacoes.</p>
        ) : (
          <div className="notifications-list">
            {groups.map((group) => (
              <section className="notifications-group" key={group.bucket}>
                <p className="notifications-group-title">{group.label}</p>
                {group.items.map((entry) => {
                  const content = (
                    <>
                      <span className="notifications-main">
                        <strong>{entry.title}</strong>
                        <span className="muted">{entry.subtitle}</span>
                        <span className="notifications-meta">
                          <span className="profile-thread-kind">
                            {categoryLabel(entry.category)}
                          </span>
                          <span className="profile-thread-time">
                            {formatRelativeTime(entry.time)}
                          </span>
                        </span>
                      </span>
                      <span className="notifications-right">
                        {!entry.read ? <span className="notifications-dot" /> : null}
                      </span>
                    </>
                  );

                  if (entry.href) {
                    return (
                      <Link
                        className={`notifications-row${entry.read ? "" : " unread"}`}
                        href={entry.href}
                        key={entry.key}
                        onClick={() => markRead([entry.key])}
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button
                      className={`notifications-row${entry.read ? "" : " unread"}`}
                      key={entry.key}
                      type="button"
                      onClick={() => markRead([entry.key])}
                    >
                      {content}
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

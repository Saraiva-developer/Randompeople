"use client";

import { useEffect, useState, useTransition } from "react";
import { toggleSavedProfileAction } from "@/features/saved/actions";

const RECENT_STORAGE_KEY = "vore:recent-profiles";
const RECENT_LIMIT = 30;

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} aria-hidden="true">
      <path
        d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4-6.5 4V5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SaveProfileButton({
  profileId,
  initialSaved
}: {
  profileId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const result = await toggleSavedProfileAction(profileId, next);
      if (!result.ok) setSaved(!next);
    });
  }

  return (
    <button
      type="button"
      className={`profile-top-circle profile-native-save${saved ? " is-saved" : ""}`}
      aria-label={saved ? "Remover dos guardados" : "Guardar perfil"}
      title={saved ? "Remover dos guardados" : "Guardar perfil"}
      disabled={pending}
      onClick={toggle}
    >
      <BookmarkIcon filled={saved} />
    </button>
  );
}

/** Records this profile in the viewer's local "Recentes" list. */
export function RecentProfileTracker({ profileId }: { profileId: string }) {
  useEffect(() => {
    if (!profileId) return;
    try {
      const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const list = Array.isArray(parsed) ? parsed.map((entry) => String(entry || "")).filter(Boolean) : [];
      const next = [profileId, ...list.filter((id) => id !== profileId)].slice(0, RECENT_LIMIT);
      window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode, quota) — recents are best-effort.
    }
  }, [profileId]);

  return null;
}

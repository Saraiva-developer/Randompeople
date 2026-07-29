"use client";

import { useState, useTransition } from "react";
import { toggleSavedEntryAction } from "@/features/saved/actions";

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

export function SaveEntryButton({
  entryKey,
  kind,
  data,
  initialSaved,
  className = "pnt-icon-btn",
  subject
}: {
  entryKey: string;
  kind: "media" | "item";
  data: Record<string, string>;
  initialSaved: boolean;
  className?: string;
  subject?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const result = await toggleSavedEntryAction({ entryKey, kind, nextSaved: next, data });
      if (!result.ok) setSaved(!next);
    });
  }

  const label = saved
    ? `Remover ${subject || "dos guardados"}`.trim()
    : `Guardar ${subject || ""}`.trim();

  return (
    <button
      type="button"
      className={`${className}${saved ? " is-saved" : ""}`}
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={toggle}
    >
      <BookmarkIcon filled={saved} />
    </button>
  );
}

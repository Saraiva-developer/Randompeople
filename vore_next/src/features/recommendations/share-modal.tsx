"use client";

import { useEffect, useState } from "react";
import { searchShareUsersAction, sendShareAction } from "@/features/recommendations/actions";
import type { ShareUser } from "@/features/recommendations/shared";

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 3 10.5 13.5M21 3l-6.75 18-3.75-7.5L3 9.75 21 3Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShareButton({
  profileId,
  profileSlug,
  profileName,
  contentType = "profile",
  contentUri = "",
  subject,
  className = "profile-top-circle profile-native-share"
}: {
  profileId: string;
  profileSlug: string;
  profileName: string;
  contentType?: "profile" | "photo" | "video" | "reel";
  contentUri?: string;
  subject?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<ShareUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ShareUser | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCandidates([]);
      setSelected(null);
      setError("");
      setDone("");
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) {
      setCandidates([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const users = await searchShareUsersAction(term);
      if (cancelled) return;
      setCandidates(users);
      setSearching(false);
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function submit() {
    if (!selected || sending) return;
    setSending(true);
    setError("");
    const result = await sendShareAction({
      receiverUserId: selected.id,
      profileId,
      profileSlug,
      sourceProfileName: profileName,
      contentType,
      contentUri
    });
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(
      result.status === "requested"
        ? "Pedido enviado. A partilha segue assim que for aceite."
        : "Partilha enviada."
    );
    setSelected(null);
  }

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={subject ? `Partilhar ${subject}` : "Partilhar perfil"}
        title={subject ? `Partilhar ${subject}` : "Partilhar perfil"}
        onClick={() => setOpen(true)}
      >
        <SendIcon />
      </button>

      {open ? (
        <div className="pnt-modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="pnt-modal-panel shr-panel"
            role="dialog"
            aria-label="Partilhar perfil"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pnt-modal-header">
              <div className="pnt-modal-heading">
                <h4 className="pnt-modal-title">{subject ? `Partilhar ${subject}` : "Partilhar perfil"}</h4>
                <span className="pnt-modal-section">{profileName}</span>
              </div>
              <button
                type="button"
                className="pnt-modal-close"
                aria-label="Fechar"
                onClick={() => setOpen(false)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="pnt-modal-body">
              <p className="shr-hint">
                Escolhe uma conta pessoal. O primeiro envio cria um pedido; depois de aceite, podes
                continuar a partilhar.
              </p>

              <input
                className="input shr-search"
                placeholder="Pesquisar por nome ou e-mail..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />

              <div className="shr-list">
                {searching ? (
                  <p className="muted shr-note">A pesquisar...</p>
                ) : !candidates.length ? (
                  <p className="muted shr-note">
                    {query.trim().length >= 2
                      ? "Sem resultados para esta pesquisa."
                      : "Escreve pelo menos 2 letras para procurar."}
                  </p>
                ) : (
                  candidates.map((candidate) => {
                    const active = selected?.id === candidate.id;
                    return (
                      <button
                        key={candidate.id}
                        type="button"
                        className={`shr-user-row${active ? " is-active" : ""}`}
                        onClick={() => setSelected(candidate)}
                      >
                        <span className="shr-user-avatar">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="8" r="3.75" stroke="#475569" strokeWidth="1.8" />
                            <path
                              d="M5.25 19.5a6.75 6.75 0 0 1 13.5 0"
                              stroke="#475569"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                        <span className="shr-user-main">
                          <span className="shr-user-name">{candidate.name || candidate.email}</span>
                          <span className="shr-user-email">{candidate.email}</span>
                        </span>
                        {active ? <span className="shr-user-check">✓</span> : null}
                      </button>
                    );
                  })
                )}
              </div>

              {error ? <p className="rvw-error">{error}</p> : null}
              {done ? <p className="rvw-saved">{done}</p> : null}

              <button
                type="button"
                className="pnt-reserve-btn"
                disabled={!selected || sending}
                onClick={submit}
              >
                {sending ? "A enviar..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

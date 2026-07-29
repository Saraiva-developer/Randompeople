"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { reactToShareAction, respondToPermissionAction } from "@/features/recommendations/actions";
import { ITEM_KIND_LABELS, REACTIONS } from "@/features/recommendations/shared";
import type {
  PermissionRequest,
  ReactionKey,
  ShareConversation,
  ShareEntry
} from "@/features/recommendations/shared";

function formatWhen(iso: string) {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "";
  const date = new Date(ts);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "ontem";
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
}

function isExpired(entry: ShareEntry) {
  const ts = Date.parse(entry.expiresAt);
  return Number.isFinite(ts) && ts < Date.now();
}

function PersonIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.75" stroke="#475569" strokeWidth="1.8" />
      <path d="M5.25 19.5a6.75 6.75 0 0 1 13.5 0" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ReactionRow({ entry }: { entry: ShareEntry }) {
  const [current, setCurrent] = useState<ReactionKey | null>(entry.myReaction);
  const [, startTransition] = useTransition();

  function pick(key: ReactionKey) {
    const next = current === key ? null : key;
    setCurrent(next);
    startTransition(async () => {
      const result = await reactToShareAction(entry.id, next);
      if (!result.ok) setCurrent(current);
    });
  }

  return (
    <div className="shr-reactions">
      {REACTIONS.map((reaction) => (
        <button
          key={reaction.key}
          type="button"
          className={`shr-reaction${current === reaction.key ? " is-active" : ""}`}
          aria-label={reaction.key}
          aria-pressed={current === reaction.key}
          onClick={() => pick(reaction.key)}
        >
          {reaction.emoji}
        </button>
      ))}
    </div>
  );
}

function ShareEntryCard({ entry }: { entry: ShareEntry }) {
  const expired = isExpired(entry);
  const kindLabel = entry.item ? ITEM_KIND_LABELS[entry.item.kind] || "Item" : "Perfil";
  const title = entry.item?.name || entry.sourceProfileName || "Perfil";

  const body = (
    <>
      {entry.item?.image ? (
        <img src={entry.item.image} alt="" className="pnt-thumb shr-entry-thumb" />
      ) : null}
      <span className="shr-entry-main">
        <span className="shr-entry-kind">{kindLabel}</span>
        <span className="shr-entry-title">{title}</span>
        {entry.item?.section ? <span className="shr-entry-sub">{entry.item.section}</span> : null}
        {entry.item?.price ? (
          <span className="pnt-promo-row">
            <span className="pnt-promo-now">{entry.item.price}</span>
            {entry.item.oldPrice ? <span className="pnt-promo-old">{entry.item.oldPrice}</span> : null}
          </span>
        ) : null}
        {entry.item && entry.sourceProfileName ? (
          <span className="shr-entry-sub">em {entry.sourceProfileName}</span>
        ) : null}
      </span>
      <span className="shr-entry-when">{formatWhen(entry.createdAt)}</span>
    </>
  );

  const card =
    expired || !entry.profileSlug ? (
      <div className="shr-entry is-expired">
        {body}
        {expired ? <span className="shr-expired-tag">Expirou</span> : null}
      </div>
    ) : (
      <Link href={`/profile/${entry.profileSlug}`} className="shr-entry">
        {body}
      </Link>
    );

  // Only the receiver reacts, matching the app.
  if (entry.direction !== "received") return card;

  return (
    <div className="shr-entry-wrap">
      {card}
      <ReactionRow entry={entry} />
    </div>
  );
}

export function SharesTab({
  conversations,
  requests
}: {
  conversations: ShareConversation[];
  requests: PermissionRequest[];
}) {
  const [query, setQuery] = useState("");
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"received" | "sent">("received");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((conversation) =>
      `${conversation.name} ${conversation.email}`.toLowerCase().includes(term)
    );
  }, [conversations, query]);

  const openConversation = conversations.find((c) => c.userId === openUserId) || null;
  const visibleEntries = (openConversation?.entries || []).filter(
    (entry) => entry.direction === direction
  );

  function respond(senderUserId: string, action: "approve" | "reject") {
    startTransition(async () => {
      await respondToPermissionAction(senderUserId, action);
    });
  }

  return (
    <div className="shr-tab">
      <div className="shr-intro">
        <h4 className="pnt-block-title">Partilha privada</h4>
        <p className="shr-hint">
          O primeiro envio cria um pedido. Depois de aceitares, esse utilizador pode continuar a
          partilhar contigo. As partilhas expiram 24 horas depois de enviadas.
        </p>
      </div>

      {requests.length ? (
        <div className="shr-requests">
          <h4 className="pnt-block-title">Pedidos de permissão</h4>
          <div className="pnt-list">
            {requests.map((request) => (
              <div key={request.senderUserId} className="shr-request-row">
                <span className="shr-user-avatar">
                  <PersonIcon />
                </span>
                <span className="shr-user-main">
                  <span className="shr-user-name">{request.senderName || request.senderEmail}</span>
                  <span className="shr-user-email">{request.senderEmail}</span>
                </span>
                <button
                  type="button"
                  className="shr-approve-btn"
                  disabled={pending}
                  onClick={() => respond(request.senderUserId, "approve")}
                >
                  Aceitar
                </button>
                <button
                  type="button"
                  className="shr-reject-btn"
                  disabled={pending}
                  onClick={() => respond(request.senderUserId, "reject")}
                >
                  Recusar
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!conversations.length ? (
        <div className="pnt-empty ppf-empty">
          <p>Ainda não tens partilhas.</p>
          <Link href="/explore" className="ppf-empty-cta">
            Descobrir perfis
          </Link>
        </div>
      ) : (
        <>
          <input
            className="input ppf-search"
            placeholder="Pesquisar conversa por nome ou e-mail..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {!filtered.length ? (
            <p className="muted ppf-hint">Sem resultados para esta pesquisa.</p>
          ) : (
            <div className="pnt-list">
              {filtered.map((conversation) => (
                <button
                  key={conversation.userId}
                  type="button"
                  className="shr-conversation"
                  onClick={() => {
                    setOpenUserId(conversation.userId);
                    setDirection("received");
                  }}
                >
                  <span className="shr-user-avatar">
                    <PersonIcon />
                  </span>
                  <span className="shr-user-main">
                    <span className="shr-user-name">{conversation.name || conversation.email}</span>
                    <span className="shr-user-email">{conversation.email}</span>
                  </span>
                  <span className="shr-entry-when">{formatWhen(conversation.lastAt)}</span>
                  <span className="shr-count">{conversation.entries.length}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {openConversation ? (
        <div className="pnt-modal-backdrop" onClick={() => setOpenUserId(null)}>
          <div
            className="pnt-modal-panel shr-panel"
            role="dialog"
            aria-label={`Partilhas com ${openConversation.name || openConversation.email}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pnt-modal-header">
              <div className="pnt-modal-heading">
                <h4 className="pnt-modal-title">{openConversation.name || openConversation.email}</h4>
                <span className="pnt-modal-section">{openConversation.email}</span>
              </div>
              <button
                type="button"
                className="pnt-modal-close"
                aria-label="Fechar"
                onClick={() => setOpenUserId(null)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="pnt-modal-body">
              <div className="pnt-subtabs shr-direction-tabs">
                {(
                  [
                    ["received", "Recebidas"],
                    ["sent", "Enviadas"]
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`pnt-subtab${direction === key ? " is-active" : ""}`}
                    onClick={() => setDirection(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {!visibleEntries.length ? (
                <p className="muted shr-note">
                  {direction === "received" ? "Nada recebido desta pessoa." : "Ainda não enviaste nada."}
                </p>
              ) : (
                <div className="pnt-list">
                  {visibleEntries.map((entry) => (
                    <ShareEntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

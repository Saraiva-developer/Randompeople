"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { logoutAction } from "@/features/auth/actions";
import type { ProfileRow, UserRow } from "@/features/vore-shell/queries";

type SettingsUi = {
  language: "pt" | "en" | "es";
  theme: "claro" | "escuro";
  profileActive: boolean;
  notifNewVisits: boolean;
  notifShares: boolean;
  notifPromos: boolean;
};

const DEFAULT_SETTINGS: SettingsUi = {
  language: "pt",
  theme: "claro",
  profileActive: true,
  notifNewVisits: true,
  notifShares: true,
  notifPromos: true
};

function accountLabel(account: UserRow | null) {
  if (!account) return "Conta convidado";
  return account.account_type === "common" ? "Conta pessoal" : "Conta profissional";
}

function languageLabel(language: SettingsUi["language"]) {
  if (language === "en") return "English";
  if (language === "es") return "Espanol";
  return "Portugues";
}

function safeSettings(value: unknown): SettingsUi {
  const raw = value && typeof value === "object" ? (value as Partial<SettingsUi>) : {};
  return {
    ...DEFAULT_SETTINGS,
    language: raw.language === "en" || raw.language === "es" ? raw.language : "pt",
    theme: raw.theme === "escuro" ? "escuro" : "claro",
    profileActive: raw.profileActive !== false,
    notifNewVisits: raw.notifNewVisits !== false,
    notifShares: raw.notifShares !== false,
    notifPromos: raw.notifPromos !== false
  };
}

function SettingsRow({
  label,
  hint,
  href,
  onClick
}: {
  label: string;
  hint?: string;
  href?: Route;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="settings-row-main">
        <span className="settings-row-label">{label}</span>
        {hint ? <span className="settings-row-hint">{hint}</span> : null}
      </span>
      <span className="settings-row-arrow">›</span>
    </>
  );

  if (href) {
    return (
      <Link className="settings-row" href={href}>
        {content}
      </Link>
    );
  }

  return (
    <button className="settings-row" type="button" onClick={onClick}>
      {content}
    </button>
  );
}

function SettingsToggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button className="settings-row" type="button" onClick={onChange}>
      <span className="settings-row-main">
        <span className="settings-row-label">{label}</span>
      </span>
      <span className={`settings-toggle${checked ? " on" : ""}`}>
        <span className="settings-toggle-dot" />
      </span>
    </button>
  );
}

export function SettingsClient({
  account,
  profile
}: {
  account: UserRow | null;
  profile: ProfileRow | null;
}) {
  const [settings, setSettings] = useState<SettingsUi>(DEFAULT_SETTINGS);
  const [message, setMessage] = useState("");

  const storageKey = account ? `vore_settings_next_${account.id}` : "";
  const isProfessional = account?.account_type === "professional";
  const isCommon = account?.account_type === "common";

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      setSettings(safeSettings(parsed));
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings, storageKey]);

  const displayName = useMemo(() => {
    return profile?.name || account?.name || account?.email || "Perfil";
  }, [account, profile]);

  function updateSetting<K extends keyof SettingsUi>(key: K, value: SettingsUi[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function clearLocalCache() {
    if (account) {
      window.localStorage.removeItem(`vore_notifications_next_${account.id}`);
      window.localStorage.removeItem(`vore_share_inbox_${account.id}`);
    }
    setMessage("Cache local limpo.");
  }

  if (!account) {
    return (
      <section>
        <div className="vore-section-heading">
          <h2>Definicoes</h2>
          <p>Modo convidado</p>
        </div>
        <div className="panel settings-hero">
          <h3>Definicoes</h3>
          <p className="muted">Entra para aceder a todas as definicoes.</p>
          <Link className="btn primary" href="/login">
            Entrar
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="panel settings-hero">
        <h3>Definicoes</h3>
        <p className="muted">{account.email}</p>
        <p className="muted">{accountLabel(account)}</p>
      </div>

      {isProfessional ? (
        <>
          <div className="settings-section">
            <h4>Conta</h4>
            <div className="settings-card">
              <div className="settings-row static">
                <span className="settings-row-main">
                  <span className="settings-row-label">{displayName}</span>
                  <span className="settings-row-hint">Nome do negocio/perfil</span>
                </span>
              </div>
              <SettingsRow label="Credenciais de acesso" hint={account.email} href="/dashboard" />
              <SettingsRow label="Editar perfil" hint="Abrir edicao completa" href="/edit-profile" />
              <SettingsToggle
                label="Perfil ativo"
                checked={settings.profileActive}
                onChange={() => updateSetting("profileActive", !settings.profileActive)}
              />
            </div>
          </div>

          <div className="settings-section">
            <h4>Notificacoes</h4>
            <div className="settings-card">
              <SettingsToggle
                label="Novas visitas ao perfil"
                checked={settings.notifNewVisits}
                onChange={() => updateSetting("notifNewVisits", !settings.notifNewVisits)}
              />
              <SettingsToggle
                label="Novas partilhas do perfil"
                checked={settings.notifShares}
                onChange={() => updateSetting("notifShares", !settings.notifShares)}
              />
              <SettingsToggle
                label="Alertas de promocoes"
                checked={settings.notifPromos}
                onChange={() => updateSetting("notifPromos", !settings.notifPromos)}
              />
            </div>
          </div>
        </>
      ) : null}

      {isCommon ? (
        <div className="settings-section">
          <h4>Conta pessoal</h4>
          <div className="settings-card">
            <SettingsRow label="Credenciais de acesso" hint={account.email} href="/dashboard" />
            <SettingsRow label="Abrir perfil pessoal" hint="Ir para o perfil" href="/profile" />
          </div>
        </div>
      ) : null}

      <div className="settings-section">
        <h4>App</h4>
        <div className="settings-card">
          <div className="settings-row static">
            <span className="settings-row-main">
              <span className="settings-row-label">Idioma</span>
              <span className="settings-row-hint">{languageLabel(settings.language)}</span>
            </span>
          </div>
          <div className="settings-language-row">
            {(["pt", "en", "es"] as const).map((language) => (
              <button
                key={language}
                className={settings.language === language ? "active" : ""}
                type="button"
                onClick={() => updateSetting("language", language)}
              >
                {languageLabel(language)}
              </button>
            ))}
          </div>
          <div className="settings-row static">
            <span className="settings-row-main">
              <span className="settings-row-label">Tema</span>
              <span className="settings-row-hint">
                {settings.theme === "escuro" ? "Escuro" : "Claro"}
              </span>
            </span>
          </div>
          <SettingsRow
            label="Limpar cache local"
            hint="Remover notificacoes e partilhas locais"
            onClick={clearLocalCache}
          />
        </div>
      </div>

      <div className="settings-section">
        <h4>Suporte e legal</h4>
        <div className="settings-card">
          <SettingsRow
            label="Ajuda"
            onClick={() => setMessage("Seccao de suporte em preparacao.")}
          />
          <SettingsRow
            label="Contacto"
            onClick={() => setMessage("Canal de contacto em preparacao.")}
          />
          <SettingsRow
            label="Termos e privacidade"
            onClick={() => setMessage("Termos e privacidade em preparacao.")}
          />
        </div>
      </div>

      <form action={logoutAction}>
        <button className="settings-logout-btn" type="submit">
          Terminar sessao
        </button>
      </form>

      {message ? <p className="muted settings-message">{message}</p> : null}
    </section>
  );
}

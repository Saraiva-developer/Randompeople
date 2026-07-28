import Link from "next/link";
import { notFound } from "next/navigation";
import { profileTypeOptions } from "@/features/profiles/constants";
import {
  getProfileBadgeType,
  getProfileData,
  getProfileSections,
  getProfileTabType,
  getSocialItems,
  getTabsForProfile
} from "@/features/profiles/view";
import { getPublicProfileBySlug } from "@/features/profiles/queries";

function getProfileTypeLabel(type: string) {
  return profileTypeOptions.find((option) => option.value === type)?.label ?? type;
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 1.6l2.47 5.24 5.77.75-4.19 4.03.99 5.76L10 14.87l-5.04 2.51.99-5.76-4.19-4.03 5.77-.75L10 1.6Z" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#2563eb" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path
        d="m8 12.4 2.6 2.6L16 9.6"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

const SOCIAL_ICON_COLORS: Record<string, string> = {
  instagram: "#e4405f",
  facebook: "#1877f2",
  tiktok: "#111827",
  youtube: "#ff0000",
  whatsapp: "#25d366",
  website: "#334155"
};

function SocialGlyph({ id }: { id: string }) {
  const key = id.replace(/-\d+$/, "");
  const color = SOCIAL_ICON_COLORS[key] || "#334155";

  if (key === "instagram") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" stroke={color} strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" />
        <circle cx="17.2" cy="6.8" r="1.3" fill={color} />
      </svg>
    );
  }
  if (key === "facebook") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={color} aria-hidden="true">
        <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.7V21h2.8Z" />
      </svg>
    );
  }
  if (key === "youtube") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2.5" y="6" width="19" height="12.5" rx="3.5" fill={color} />
        <path d="m10.2 9.7 5 2.55-5 2.55v-5.1Z" fill="#fff" />
      </svg>
    );
  }
  if (key === "whatsapp") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5Z"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M9.3 8.6c.6 2.6 2.5 4.9 5.1 5.9l1.3-1.3-.4-1.5-1.8-.3-.8.7c-.9-.5-1.7-1.3-2.2-2.2l.7-.8-.3-1.8-1.6-.4Z"
          fill={color}
        />
      </svg>
    );
  }
  if (key === "tiktok") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={color} aria-hidden="true">
        <path d="M14.5 3h2.6c.2 1.8 1.3 3 3.4 3.3v2.7c-1.3 0-2.5-.4-3.4-1v6.2a5.9 5.9 0 1 1-5.9-5.9c.3 0 .6 0 .9.1v2.9a3 3 0 1 0 2.4 2.9V3Z" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="2" />
      <path
        d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5s1.2-6.2 3.6-8.5Z"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
}

function firstMediaUrl(item: Record<string, unknown>) {
  const direct = String(item.image || item.imageUrl || item.mediaUrl || item.cover || item.thumbnail || "").trim();
  if (direct) return direct;
  const images = Array.isArray(item.images) ? item.images : [];
  const first = images.find((entry) => String(entry || "").trim());
  return String(first || "").trim();
}

function formatEuroPrice(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.includes("€")) return text;
  if (/\bEUR\b/i.test(text)) return text.replace(/\s*EUR\b/gi, " €").replace(/\s+€/g, " €").trim();
  if (/^\d+(?:[.,]\d{1,2})?$/.test(text)) return `${text} €`;
  return text;
}

function renderGallery(items: Array<Record<string, unknown>>) {
  if (!items.length) {
    return <div className="profile-empty">Sem conteudo nesta aba.</div>;
  }

  return (
    <div className="profile-gallery-grid">
      {items.map((item, index) => {
        const mediaUrl = String(item.mediaUrl || "");
        const isVideo = String(item.mediaType || "") === "video";

        return (
          <article key={`${mediaUrl}-${index}`} className="profile-gallery-card">
            {isVideo ? (
              <video className="profile-gallery-media" controls preload="metadata" src={mediaUrl} />
            ) : (
              <img className="profile-gallery-media" src={mediaUrl} alt={String(item.name || "Media")} />
            )}
          </article>
        );
      })}
    </div>
  );
}

function renderSchedule(items: Array<Record<string, unknown>>) {
  if (!items.length) {
    return <div className="profile-empty">Sem horario definido.</div>;
  }

  return (
    <div className="profile-list">
      {items.map((item, index) => (
        <article key={`${item.name}-${index}`} className="profile-row-card">
          <strong>{String(item.name || "Dia")}</strong>
          <span>{String(item.time || "-")}</span>
        </article>
      ))}
    </div>
  );
}

function renderAgenda(items: Array<Record<string, unknown>>) {
  if (!items.length) {
    return <div className="profile-empty">Sem agenda definida.</div>;
  }

  return (
    <div className="profile-list">
      {items.map((item, index) => (
        <article key={`${item.weekday}-${index}`} className="profile-panel-card">
          <div className="profile-panel-top">
            <strong>{String(item.weekday || "Agenda")}</strong>
            <span>{String(item.day || "")}</span>
          </div>
          <p>{Array.isArray(item.times) ? item.times.join(" | ") : String(item.times || "-")}</p>
        </article>
      ))}
    </div>
  );
}

function renderPartners(items: Array<Record<string, unknown>>) {
  if (!items.length) {
    return <div className="profile-empty">Sem parcerias nesta aba.</div>;
  }

  return (
    <div className="profile-partners-grid">
      {items.map((item, index) => (
        <article key={`${item.name}-${index}`} className="profile-partner-card">
          {String(item.image || "").trim() ? (
            <img className="profile-partner-avatar" src={String(item.image)} alt={String(item.name || "Parceiro")} />
          ) : (
            <div className="profile-partner-avatar placeholder">
              {String(item.name || "P").slice(0, 1).toUpperCase()}
            </div>
          )}
          <strong>{String(item.name || "Parceiro")}</strong>
          <span>{String(item.category || "")}</span>
          <span>{String(item.location || "")}</span>
        </article>
      ))}
    </div>
  );
}

function renderLocations(items: Array<Record<string, unknown>>) {
  if (!items.length) {
    return <div className="profile-empty">Sem locais definidos.</div>;
  }

  return (
    <div className="profile-list">
      {items.map((item, index) => (
        <article key={`${item.name || item.title}-${index}`} className="profile-location-card">
          <div>
            <strong>{String(item.name || item.title || "Local")}</strong>
            <p>{String(item.address || "")}</p>
          </div>
          {String(item.link || "").trim() ? (
            <a href={String(item.link)} target="_blank" rel="noreferrer" className="secondary-button">
              Mapa
            </a>
          ) : (
            <span className="profile-location-muted">Sem mapa</span>
          )}
        </article>
      ))}
    </div>
  );
}

function renderGenericCards(items: Array<Record<string, unknown>>) {
  if (!items.length) {
    return <div className="profile-empty">Sem itens nesta aba.</div>;
  }

  return (
    <div className="profile-generic-grid">
      {items.map((item, index) => (
        <article key={`${item.name || item.title}-${index}`} className="profile-generic-card">
          {firstMediaUrl(item) ? (
            <img
              className="profile-generic-image"
              src={firstMediaUrl(item)}
              alt={String(item.name || item.title || "Item")}
            />
          ) : null}
          <strong>{String(item.name || item.title || "Item")}</strong>
          {String(item.description || item.note || "").trim() ? (
            <p>{String(item.description || item.note)}</p>
          ) : null}
          {String(item.price || item.promoNowPrice || "").trim() ? (
            <span className="profile-price-pill">
              {formatEuroPrice(item.price || item.promoNowPrice)}
            </span>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function renderSectionContent(tabId: string, items: Array<Record<string, unknown>>) {
  if (tabId === "galeria") return renderGallery(items);
  if (tabId === "horario") return renderSchedule(items);
  if (tabId === "agenda") return renderAgenda(items);
  if (tabId === "parcerias") return renderPartners(items);
  if (tabId === "locais") return renderLocations(items);
  return renderGenericCards(items);
}

export default async function PublicProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; subtab?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const profile = await getPublicProfileBySlug(slug);

  if (!profile) {
    notFound();
  }

  const profileData = getProfileData(profile.data);
  const tabs = getTabsForProfile(profile.type, profileData);
  const activeTab = tabs.find((tab) => tab.id === query.tab)?.id || tabs[0]?.id || "sobre";
  const activeTabType = getProfileTabType(profileData, activeTab);
  const sections = getProfileSections(profileData, activeTab);
  const activeSection =
    sections.find((section) => section.id === query.subtab) || sections[0] || null;
  const badgeType = getProfileBadgeType(profileData);
  const socialItems = getSocialItems(profileData).filter((item) => item.url);
  const avatarImage = String(profile.avatar_url || profileData.avatar || "").trim();
  const category = String(
    profileData.category || profileData.role || getProfileTypeLabel(profile.type)
  ).trim();
  const rating = String(profileData.rating || "").trim();
  const about = String(profileData.about || profile.bio || "").trim();

  return (
    <main className="page-shell">
      <section className="legacy-profile-shell">
        <div className="profile-native-head">
          <Link href="/" className="profile-top-circle profile-native-back" aria-label="Voltar">
            ‹
          </Link>
          <Link
            href="/edit-profile"
            className="profile-top-circle profile-native-more"
            aria-label="Opcoes"
          >
            ⋮
          </Link>

          <div className="profile-native-avatar-wrap">
            {avatarImage ? (
              <img className="profile-native-avatar" src={avatarImage} alt={profile.name} />
            ) : (
              <div className="profile-native-avatar placeholder">
                {profile.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          {badgeType === "promo" || badgeType === "novo" ? (
            <div className="profile-native-badge-row">
              <span className={`profile-native-badge profile-native-badge-${badgeType}`}>
                {badgeType === "promo" ? "Promo" : "Novo"}
              </span>
            </div>
          ) : null}

          <div className="profile-native-name-row">
            <h1>{profile.name}</h1>
            {badgeType === "verif" ? <VerifiedIcon /> : null}
          </div>

          <p className="profile-native-role">{category}</p>

          <div className="profile-native-meta-row">
            <span className="profile-native-meta-item">
              <PinIcon />
              {profile.location || "Sem localizacao"}
            </span>
            <span className="profile-native-meta-item">
              <span className="profile-native-star">
                <StarIcon />
              </span>
              {rating || "-"}
            </span>
          </div>

          {socialItems.length ? (
            <>
              <div className="profile-native-social-row">
                {socialItems.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-native-social-btn"
                    title={item.label}
                    aria-label={item.label}
                  >
                    <SocialGlyph id={item.id} />
                  </a>
                ))}
              </div>
              <div className="profile-native-divider" />
            </>
          ) : null}
        </div>

        <div className="legacy-profile-tabs">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/profile/${profile.slug}?tab=${tab.id}`}
              className={tab.id === activeTab ? "active" : ""}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {activeTab === "sobre" ? (
          <div className="legacy-profile-content">
            <div className="profile-about-content">
              {(about ||
                "Sem descricao ainda. Esta area replica a aba 'Sobre' da Vore original e vai crescer com mais detalhe visual e funcional.")
                .replace(/<\/?p>/g, "\n\n")
                .split(/\n{2,}/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
          </div>
        ) : (
          <>
            {sections.length ? (
              <div className="legacy-profile-subtabs">
                {sections.map((section) => (
                  <Link
                    key={section.id}
                    href={`/profile/${profile.slug}?tab=${activeTab}&subtab=${section.id}`}
                    className={section.id === activeSection?.id ? "active" : ""}
                  >
                    {section.label}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="legacy-profile-content">
              {renderSectionContent(activeTabType, activeSection?.items || [])}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

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
  const socialItems = getSocialItems(profileData);
  const coverImage = String(profile.cover_url || profileData.cover || "").trim();
  const avatarImage = String(profile.avatar_url || profileData.avatar || "").trim();
  const category = String(
    profileData.category || profileData.role || getProfileTypeLabel(profile.type)
  ).trim();
  const rating = String(profileData.rating || "").trim();
  const about = String(profileData.about || profile.bio || "").trim();

  return (
    <main className="page-shell">
      <section className="legacy-profile-shell">
        {coverImage ? (
          <div
            className="legacy-profile-cover"
            style={{ backgroundImage: `linear-gradient(180deg, rgba(9,16,29,0.18), rgba(9,16,29,0.58)), url(${coverImage})` }}
          />
        ) : (
          <div className="legacy-profile-cover legacy-profile-cover-placeholder" />
        )}

        <div className="legacy-profile-head">
          <div className="legacy-profile-head-top">
            <Link href="/" className="profile-top-circle">
              ←
            </Link>
            <div className="legacy-profile-head-actions">
              <Link href="/edit-profile" className="profile-top-circle">
                ⋮
              </Link>
            </div>
          </div>

          <div className="legacy-profile-head-main">
            <div className="legacy-profile-avatar-wrap">
              {avatarImage ? (
                <img className="legacy-profile-avatar" src={avatarImage} alt={profile.name} />
              ) : (
                <div className="legacy-profile-avatar placeholder">
                  {profile.name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div className="legacy-profile-main-copy">
              <div className="legacy-profile-name-row">
                <h1>{profile.name}</h1>
                {badgeType === "verif" ? <span className="legacy-profile-verified">✓</span> : null}
              </div>

              <p className="legacy-profile-category">{category}</p>

              <div className="legacy-profile-meta-row">
                <span className="legacy-profile-pill">
                  📍 {profile.location || "Sem localizacao"}
                </span>
                <span className="legacy-profile-pill">★ {rating || "-"}</span>
              </div>

              {socialItems.length ? (
                <div className="legacy-profile-social-row">
                  {socialItems.map((item) => (
                    item.url ? (
                      <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="legacy-profile-social-btn">
                        {item.label}
                      </a>
                    ) : (
                      <span key={item.id} className="legacy-profile-social-btn is-empty">
                        {item.label}
                      </span>
                    )
                  ))}
                </div>
              ) : null}
            </div>
          </div>
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
              <p>
                {about ||
                  "Sem descricao ainda. Esta area replica a aba 'Sobre' da Vore original e vai crescer com mais detalhe visual e funcional."}
              </p>
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

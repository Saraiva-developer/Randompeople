import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/session";
import { saveProfileAction } from "@/features/profiles/actions";
import { ProfileContentEditor } from "@/features/profiles/content-editor";
import { profileTypeOptions } from "@/features/profiles/constants";
import { getProfileByUserId } from "@/features/profiles/queries";
import { getProfileData } from "@/features/profiles/view";
import type { Json } from "@/types/supabase";

function asRecord(value: Json | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {};
}

function formatContentLines(value: Json | null | undefined) {
  const rows = Array.isArray(value) ? value : [];

  return rows
    .map((row) => {
      const item = asRecord(row);
      const name = String(item.name || item.title || "").trim();
      if (!name) return "";

      return [
        name,
        String(item.price || item.promoNowPrice || item.nightlyPrice || "").trim(),
        String(item.description || item.note || item.shortDescription || "").trim(),
        String(item.imageUrl || item.image || "").trim()
      ].join(" | ");
    })
    .filter(Boolean)
    .join("\n");
}

export default async function ProfileSetupPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?message=Faz login para criares o teu perfil.");
  }

  const [profile, { message }] = await Promise.all([
    getProfileByUserId(user.id),
    searchParams
  ]);
  const profileData = getProfileData(profile?.data);
  const avatarValue = String(profile?.avatar_url || profileData.avatar || "").trim();
  const coverValue = String(profile?.cover_url || profileData.cover || "").trim();
  const profileInitial = String(profile?.name || "P").slice(0, 1).toUpperCase();
  const tabLabels = [
    "Sobre",
    profile?.type === "shop" ? "Produtos" : profile?.type === "food" ? "Menu" : "Servicos",
    "Galeria",
    "Horario",
    "Agenda",
    "Parcerias",
    "Localizacao"
  ];

  return (
    <div id="edit" className="edit-next-screen">
      <div className="edit-studio-layout">
        <div className="edit-studio-main">
          <form action={saveProfileAction} className="edit-root">
          <div className="edit-editor-head">
            <div>
              <h3>Editar Perfil</h3>
              <p className="muted">
                Ajusta a pagina publica com a estrutura da Vore.
              </p>
            </div>
            <div className="edit-save-actions">
              <button type="submit" className="primary-button">
                Guardar
              </button>
              {profile?.slug ? (
                <Link href={`/profile/${profile.slug}`} className="secondary-button">
                  Ver pagina
                </Link>
              ) : null}
            </div>
          </div>

          {message ? <p className="auth-message">{message}</p> : null}

          <section className="edit-section-card edit-avatar-section">
            <div className="edit-section-header">
              <h4 className="edit-section-title">Foto de perfil</h4>
            </div>
            <div className="edit-avatar-layout">
              {avatarValue ? (
                <img className="edit-avatar-preview" src={avatarValue} alt="Avatar" />
              ) : (
                <div className="edit-avatar-preview placeholder">{profileInitial}</div>
              )}
              <div className="edit-avatar-actions">
                <label className="field edit-avatar-url-field">
                  <span>Avatar URL</span>
                  <input
                    className="input"
                    name="avatarUrl"
                    type="url"
                    defaultValue={avatarValue}
                    placeholder="https://..."
                  />
                </label>
                <label className="field edit-avatar-url-field">
                  <span>Cover URL</span>
                  <input
                    className="input"
                    name="coverUrl"
                    type="url"
                    defaultValue={coverValue}
                    placeholder="https://..."
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="edit-section-card">
            <div className="edit-section-header">
              <h4 className="edit-section-title">Informacao basica</h4>
            </div>
          <div className="form-grid">
            <label className="field">
              <span>Nome do perfil</span>
              <input
                name="name"
                type="text"
                defaultValue={profile?.name ?? ""}
                placeholder="Studio Vore Lisboa"
                required
              />
            </label>

            <label className="field">
              <span>Slug</span>
              <input
                name="slug"
                type="text"
                defaultValue={profile?.slug ?? ""}
                placeholder="studio-vore-lisboa"
              />
            </label>

            <label className="field">
              <span>Tipo de perfil</span>
              <select name="type" defaultValue={profile?.type ?? "service_pro"}>
                {profileTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Localizacao</span>
              <input
                name="location"
                type="text"
                defaultValue={profile?.location ?? ""}
                placeholder="Lisboa"
              />
            </label>

            <label className="field">
              <span>Categoria</span>
              <input
                name="category"
                type="text"
                defaultValue={String(profileData.category || profileData.role || "")}
                placeholder="Massagem, Loja, Criador..."
              />
            </label>

            <label className="field">
              <span>Rating</span>
              <input
                name="rating"
                type="text"
                defaultValue={String(profileData.rating || "")}
                placeholder="4.8"
              />
            </label>

          </div>

          <label className="field">
            <span>Bio</span>
            <textarea
              name="bio"
              className="field-textarea"
              defaultValue={profile?.bio ?? ""}
              placeholder="Descreve o perfil, servicos ou identidade da pagina."
              rows={5}
            />
          </label>
          </section>

          <section className="edit-section-card">
            <div className="edit-section-header">
              <h4 className="edit-section-title">Redes e links</h4>
            </div>
          <div className="form-grid">
            <label className="field">
              <span>Instagram</span>
              <input
                name="instagram"
                type="url"
                defaultValue={String(
                  (profileData.social &&
                    typeof profileData.social === "object" &&
                    !Array.isArray(profileData.social) &&
                    profileData.social.instagram) ||
                    ""
                )}
                placeholder="https://instagram.com/..."
              />
            </label>

            <label className="field">
              <span>WhatsApp</span>
              <input
                name="whatsapp"
                type="url"
                defaultValue={String(
                  (profileData.social &&
                    typeof profileData.social === "object" &&
                    !Array.isArray(profileData.social) &&
                    profileData.social.whatsapp) ||
                    ""
                )}
                placeholder="https://wa.me/..."
              />
            </label>

            <label className="field">
              <span>Website</span>
              <input
                name="website"
                type="url"
                defaultValue={String(profileData.website || profileData.site || "")}
                placeholder="https://..."
              />
            </label>
          </div>
          </section>

          <section className="edit-section-card">
            <div className="edit-section-header">
              <h4 className="edit-section-title">Galeria</h4>
            </div>
          <div className="form-grid">
            <label className="field">
              <span>Fotos da galeria</span>
              <textarea
                name="galleryPhotos"
                className="field-textarea"
                defaultValue={Array.isArray(
                  profileData.gallery &&
                    typeof profileData.gallery === "object" &&
                    !Array.isArray(profileData.gallery) &&
                    profileData.gallery.photos
                )
                  ? (
                      profileData.gallery as {
                        photos?: string[];
                      }
                    ).photos?.join("\n")
                  : ""}
                placeholder="Uma URL por linha"
                rows={5}
              />
            </label>

            <label className="field">
              <span>Videos da galeria</span>
              <textarea
                name="galleryVideos"
                className="field-textarea"
                defaultValue={Array.isArray(
                  profileData.gallery &&
                    typeof profileData.gallery === "object" &&
                    !Array.isArray(profileData.gallery) &&
                    profileData.gallery.videos
                )
                  ? (
                      profileData.gallery as {
                        videos?: string[];
                      }
                    ).videos?.join("\n")
                  : ""}
                placeholder="Uma URL por linha"
                rows={5}
              />
            </label>

            <label className="field">
              <span>Reels</span>
              <textarea
                name="galleryReels"
                className="field-textarea"
                defaultValue={Array.isArray(
                  profileData.gallery &&
                    typeof profileData.gallery === "object" &&
                    !Array.isArray(profileData.gallery) &&
                    profileData.gallery.reels
                )
                  ? (
                      profileData.gallery as {
                        reels?: string[];
                      }
                    ).reels?.join("\n")
                  : ""}
                placeholder="Uma URL por linha"
                rows={5}
              />
            </label>
          </div>
          </section>

          <section className="edit-section-card">
            <div className="edit-section-header">
              <h4 className="edit-section-title">Horario e agenda</h4>
            </div>
          <div className="form-grid">
            <label className="field">
              <span>Horario</span>
              <textarea
                name="schedule"
                className="field-textarea"
                defaultValue={
                  profileData.schedule &&
                  typeof profileData.schedule === "object" &&
                  !Array.isArray(profileData.schedule)
                    ? Object.entries(profileData.schedule)
                        .map(([key, value]) => `${key}: ${String(value || "")}`)
                        .join("\n")
                    : ""
                }
                placeholder={"seg: 09:00-18:00\nter: 09:00-18:00"}
                rows={5}
              />
            </label>

            <label className="field">
              <span>Agenda</span>
              <textarea
                name="agenda"
                className="field-textarea"
                defaultValue={
                  profileData.agenda &&
                  typeof profileData.agenda === "object" &&
                  !Array.isArray(profileData.agenda) &&
                  Array.isArray(profileData.agenda.slots)
                    ? profileData.agenda.slots
                        .map((slot) => {
                          if (!slot || typeof slot !== "object" || Array.isArray(slot)) return "";
                          const safeSlot = slot as {
                            weekday?: string;
                            day?: string;
                            times?: string[];
                          };
                          return `${safeSlot.weekday || ""} | ${safeSlot.day || ""} | ${(safeSlot.times || []).join(", ")}`;
                        })
                        .filter(Boolean)
                        .join("\n")
                    : ""
                }
                placeholder={"Segunda | 22 Abril | 10:00, 14:00"}
                rows={5}
              />
            </label>
          </div>
          </section>

          <section className="edit-section-card edit-tab-manager-section">
            <div className="edit-tab-manager-header edit-section-header">
              <h4 className="edit-section-title">Abas do perfil</h4>
            </div>
            <p className="muted">Ativa, desativa, remove e reordena as abas como na app.</p>
            <div className="edit-tabs-create">
              <p className="edit-tabs-subtitle">Adicionar nova aba</p>
              <div className="edit-tab-add-row">
                <select className="input" defaultValue="servicos" aria-label="Tipo da nova aba">
                  <option value="servicos">Servicos</option>
                  <option value="produtos">Produtos</option>
                  <option value="menu">Menu</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="campanhas">Campanhas</option>
                  <option value="casas">Casas</option>
                  <option value="quartos">Quartos</option>
                </select>
                <input className="input" placeholder="Nome da nova aba (opcional)" />
                <button type="button" className="edit-primary-action">+ Adicionar aba</button>
              </div>
            </div>
            <div className="edit-tabs-divider" aria-hidden="true" />
            <div className="edit-tabs-existing">
              <div className="edit-tabs-existing-head">
                <p className="edit-tabs-subtitle">Abas ja adicionadas</p>
                <div className="chips edit-tab-manager-move">
                  <button type="button" aria-label="Mover para cima">↑</button>
                  <button type="button" aria-label="Mover para baixo">↓</button>
                </div>
              </div>
              <div className="edit-tab-manager-list">
                {tabLabels.map((label, index) => (
                  <div className={`edit-tab-manager-item${index === 0 ? " active" : ""}`} key={label}>
                    <span className="edit-drag-handle" aria-hidden="true">⋮⋮</span>
                    <button type="button" className="edit-tab-manager-select">{label}</button>
                    <button type="button" className="edit-tab-icon-btn" aria-label="Mostrar aba">Ver</button>
                    <button type="button" className="edit-tab-icon-btn is-danger" aria-label="Remover aba">X</button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <ProfileContentEditor
            blocks={[
              {
                name: "services",
                label: "Servicos",
                placeholder: "Massagem relaxante",
                initialLines: formatContentLines(profileData.services)
              },
              {
                name: "products",
                label: "Produtos",
                placeholder: "Produto premium",
                initialLines: formatContentLines(profileData.products)
              },
              {
                name: "menu",
                label: "Menu",
                placeholder: "Prato do dia",
                initialLines: formatContentLines(profileData.menu)
              },
              {
                name: "portfolio",
                label: "Portfolio",
                placeholder: "Projeto",
                initialLines: formatContentLines(profileData.portfolio)
              },
              {
                name: "houses",
                label: "Casas",
                placeholder: "Casa T2",
                initialLines: formatContentLines(profileData.houses)
              },
              {
                name: "rooms",
                label: "Quartos",
                placeholder: "Quarto duplo",
                initialLines: formatContentLines(profileData.rooms)
              },
              {
                name: "campaigns",
                label: "Campanhas",
                placeholder: "Campanha de primavera",
                initialLines: formatContentLines(profileData.campaigns)
              }
            ]}
          />

          <section className="edit-section-card">
            <div className="edit-section-header">
              <h4 className="edit-section-title">Parcerias e locais</h4>
            </div>
          <div className="form-grid">
            <label className="field">
              <span>Parcerias</span>
              <textarea
                name="partners"
                className="field-textarea"
                defaultValue={Array.isArray(profileData.partners)
                  ? profileData.partners
                      .map((partner) => {
                        if (!partner || typeof partner !== "object" || Array.isArray(partner)) return "";
                        const safePartner = partner as {
                          name?: string;
                          category?: string;
                          location?: string;
                          image?: string;
                        };
                        return `${safePartner.name || ""} | ${safePartner.category || ""} | ${safePartner.location || ""} | ${safePartner.image || ""}`;
                      })
                      .filter(Boolean)
                      .join("\n")
                  : ""}
                placeholder={"Nome | Categoria | Localizacao | imagem-url"}
                rows={5}
              />
            </label>

            <label className="field">
              <span>Locais</span>
              <textarea
                name="locations"
                className="field-textarea"
                defaultValue={Array.isArray(profileData.locations)
                  ? profileData.locations
                      .map((locationItem) => {
                        if (
                          !locationItem ||
                          typeof locationItem !== "object" ||
                          Array.isArray(locationItem)
                        ) {
                          return "";
                        }

                        const safeLocation = locationItem as {
                          name?: string;
                          address?: string;
                          link?: string;
                        };
                        return `${safeLocation.name || ""} | ${safeLocation.address || ""} | ${safeLocation.link || ""}`;
                      })
                      .filter(Boolean)
                      .join("\n")
                  : ""}
                placeholder={"Nome | Morada | link-mapa"}
                rows={5}
              />
            </label>
          </div>
          </section>

          <section className="edit-section-card">
            <div className="edit-section-header">
              <h4 className="edit-section-title">Publicacao</h4>
            </div>
          <label className="checkbox-row">
            <input
              name="verified"
              type="checkbox"
              defaultChecked={Boolean(profileData.verified)}
            />
            <span>Marcar perfil como verificado</span>
          </label>

          <label className="checkbox-row">
            <input
              name="isPublished"
              type="checkbox"
              defaultChecked={profile?.is_published ?? false}
            />
            <span>Publicar perfil e permitir acesso pela pagina publica</span>
          </label>
          </section>

          <div className="edit-save-row">
            <div className="cta-row">
            <button type="submit" className="primary-button">
              Guardar perfil
            </button>

            <Link href="/" className="secondary-button">
              Home
            </Link>

            {profile?.slug ? (
              <Link href={`/profile/${profile.slug}`} className="secondary-button">
                Ver pagina publica
              </Link>
            ) : null}
          </div>
          </div>
          </form>
        </div>
        <aside className="edit-studio-preview">
          <div className="edit-studio-preview-sticky">
            <div className="edit-studio-preview-header">
              <h4>Preview</h4>
              <p className="muted">Aparencia publica aproximada.</p>
            </div>
            <div className="edit-studio-preview-shell">
              <div className="edit-preview-shell">
                <div className="edit-preview-head">
                  <div className="legacy-profile-head-main edit-preview-profile-head">
                    <div className="legacy-profile-avatar-wrap">
                      {avatarValue ? (
                        <img className="legacy-profile-avatar" src={avatarValue} alt={profile?.name || "Perfil"} />
                      ) : (
                        <div className="legacy-profile-avatar placeholder">{profileInitial}</div>
                      )}
                    </div>
                    <div className="legacy-profile-main-copy">
                      <div className="legacy-profile-name-row">
                        <h1>{profile?.name || "Perfil"}</h1>
                      </div>
                      <p className="legacy-profile-category">
                        {String(profileData.category || profileData.role || "Servicos")}
                      </p>
                      <div className="legacy-profile-meta-row">
                        <span className="legacy-profile-pill">{profile?.location || "Portugal"}</span>
                        {profileData.rating ? (
                          <span className="legacy-profile-pill">★ {String(profileData.rating)}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="chips edit-preview-tabs">
                  {tabLabels.map((label, index) => (
                    <button className={index === 0 ? "active" : ""} type="button" key={label}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="panel edit-preview-content">
                  <p className="edit-preview-about-summary">
                    {String(profileData.aboutSummary || profile?.bio || "Sem descricao ainda.")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

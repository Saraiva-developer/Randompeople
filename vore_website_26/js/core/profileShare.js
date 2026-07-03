export function buildProfileShareUrlUi(profile, locationRef) {
  const slug = String((profile && profile.slug) || "").trim();
  const base = String(locationRef.origin || "") + String(locationRef.pathname || "");
  if (slug) return base + "#perfil-" + encodeURIComponent(slug);
  return base;
}

export async function shareProfileUi(ctx, profile) {
  const { buildProfileShareUrl, navigatorRef, alertRef, promptRef } = ctx || {};
  const target = profile && typeof profile === "object" ? profile : null;
  if (!target) return;
  const url = buildProfileShareUrl(target);
  const title = String(target.name || "Perfil");
  const text = title + " - " + String(target.category || "Perfil");
  try {
    if (navigatorRef.share) {
      await navigatorRef.share({ title, text, url });
      return;
    }
  } catch (_err) {
    return;
  }
  try {
    if (navigatorRef.clipboard && navigatorRef.clipboard.writeText) {
      await navigatorRef.clipboard.writeText(url);
      alertRef("Link copiado.");
      return;
    }
  } catch (_e) {}
  promptRef("Copia o link do perfil:", url);
}

export function toOpenableUrlUi(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return "https://" + raw;
  return "";
}

export function toSocialUrlUi(type, rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const clean = raw.replace(/^@+/, "");
  const baseByType = {
    instagram: "https://instagram.com/",
    tiktok: "https://www.tiktok.com/@",
    youtube: "https://youtube.com/",
    facebook: "https://facebook.com/",
    linkedin: "https://linkedin.com/in/",
    whatsapp: "https://wa.me/",
    x: "https://x.com/",
  };
  const base = baseByType[String(type || "").toLowerCase()] || "";
  if (!base) return toOpenableUrlUi(raw);
  return base + encodeURIComponent(clean);
}

export function detectSocialIconUi(url, hint = "") {
  const lower = String(url || "").toLowerCase();
  const type = String(hint || "").toLowerCase();
  if (type === "instagram" || lower.includes("instagram.")) return "instagram";
  if (type === "tiktok" || lower.includes("tiktok.")) return "tiktok";
  if (type === "youtube" || lower.includes("youtube.") || lower.includes("youtu.be")) return "youtube";
  if (type === "facebook" || lower.includes("facebook.")) return "facebook";
  if (type === "linkedin" || lower.includes("linkedin.")) return "linkedin";
  if (type === "whatsapp" || lower.includes("wa.me") || lower.includes("whatsapp.")) return "whatsapp";
  if (type === "x" || lower.includes("x.com") || lower.includes("twitter.")) return "x";
  return "website";
}

export function getSocialIconSvgUi(icon) {
  const key = String(icon || "").toLowerCase();
  if (key === "instagram") {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><rect x='3.5' y='3.5' width='17' height='17' rx='5' stroke='currentColor' stroke-width='2'/><circle cx='12' cy='12' r='4' stroke='currentColor' stroke-width='2'/><circle cx='17.5' cy='6.5' r='1.2' fill='currentColor'/></svg>";
  }
  if (key === "tiktok") {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M14 3v8.8a4.2 4.2 0 1 1-2-3.5V3h2Zm0 0c.9 2 2.3 3.1 4 3.5v2.2c-1.5-.2-2.9-.8-4-1.8' fill='currentColor'/></svg>";
  }
  if (key === "youtube") {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><rect x='2.5' y='5.5' width='19' height='13' rx='4' stroke='currentColor' stroke-width='2'/><path d='M10 9.2 15 12l-5 2.8V9.2Z' fill='currentColor'/></svg>";
  }
  if (key === "facebook") {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v5h3v-5h2.3l.7-3H13V9c0-.6.4-1 1-1Z' fill='currentColor'/></svg>";
  }
  if (key === "linkedin") {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><rect x='3' y='3' width='18' height='18' rx='3' stroke='currentColor' stroke-width='2'/><circle cx='8' cy='9' r='1.3' fill='currentColor'/><path d='M6.8 11.2h2.3V17H6.8v-5.8Zm5 0h2.2v.8c.5-.6 1.3-1 2.2-1 2 0 3 1.3 3 3.4V17h-2.3v-2.4c0-1.1-.4-1.8-1.4-1.8s-1.5.7-1.5 1.8V17h-2.2v-5.8Z' fill='currentColor'/></svg>";
  }
  if (key === "whatsapp") {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M20 12a8 8 0 0 1-11.8 7L4 20l1.1-4.1A8 8 0 1 1 20 12Z' stroke='currentColor' stroke-width='2'/><path d='M9.3 9.4c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4.2.4.6 1.5.7 1.6.1.2.1.3 0 .5l-.4.5c-.1.1-.2.2-.1.4.3.6 1 1.5 2.1 2 .2.1.4 0 .5-.1l.6-.7c.1-.2.3-.2.5-.1l1.6.7c.2.1.3.2.3.4 0 .4-.2 1-.6 1.3-.4.3-.8.5-1.3.4-1.1-.2-2.1-.8-3.1-1.7-.9-.9-1.6-2-1.9-3.2-.2-.8.1-1.5.5-2Z' fill='currentColor'/></svg>";
  }
  if (key === "x") {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M5 4h3.2l3.8 5.4L16.2 4H19l-5.7 6.5L19.5 20h-3.2l-4.2-6-5.3 6H4l6.3-7.2L5 4Z' fill='currentColor'/></svg>";
  }
  return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><circle cx='12' cy='12' r='9' stroke='currentColor' stroke-width='2'/><path d='M3.5 12h17M12 3.5c2 2.3 3.1 5.3 3.1 8.5S14 18.2 12 20.5C10 18.2 8.9 15.2 8.9 12S10 5.8 12 3.5Z' stroke='currentColor' stroke-width='2'/></svg>";
}

export function getSocialIconLabelUi(icon) {
  const key = String(icon || "").toLowerCase();
  if (key === "instagram") return "Instagram";
  if (key === "tiktok") return "TikTok";
  if (key === "youtube") return "YouTube";
  if (key === "facebook") return "Facebook";
  if (key === "linkedin") return "LinkedIn";
  if (key === "whatsapp") return "WhatsApp";
  if (key === "x") return "X";
  return "Website";
}

export function getSocialItemsUi(ctx, profileData) {
  const { toSocialUrl, toOpenableUrl, detectSocialIcon } = ctx || {};
  const items = [];
  const seen = new Set();
  const social = profileData && typeof profileData.social === "object" ? profileData.social : {};
  function pushItem(iconHint, rawValue, allowEmpty = false) {
    const cleanHint = String(iconHint || "website").toLowerCase() || "website";
    const url = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "whatsapp", "x"].includes(iconHint)
      ? toSocialUrl(iconHint, rawValue)
      : toOpenableUrl(rawValue);
    const icon = url ? detectSocialIcon(url, iconHint) : (cleanHint === "outro" ? "website" : cleanHint);
    if (!url && !allowEmpty) return;
    if (!url && !cleanHint) return;
    const key = icon + "|" + (url || "__empty__");
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ icon, url, empty: !url });
  }
  pushItem("instagram", social.instagram);
  pushItem("tiktok", social.tiktok);
  pushItem("youtube", social.youtube);
  pushItem("facebook", social.facebook);
  pushItem("linkedin", social.linkedin);
  pushItem("x", social.x || social.twitter);
  pushItem("whatsapp", social.whatsapp);
  pushItem("website", profileData && (profileData.website || profileData.site));
  if (Array.isArray(profileData && profileData.links)) {
    profileData.links.forEach((entry) => {
      const raw = typeof entry === "string" ? entry : String((entry && entry.url) || "");
      const type = typeof entry === "string" ? "" : String((entry && entry.type) || "").toLowerCase();
      pushItem(type || "website", raw, true);
    });
  }
  return items.slice(0, 12);
}

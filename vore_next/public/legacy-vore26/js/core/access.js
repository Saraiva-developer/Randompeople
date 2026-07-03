export function hasAccessSessionUi(state) {
  return !!state.authUser || !!state.guestMode;
}

export function getAccountTypeUi(state) {
  return String((state.authUser && state.authUser.account_type) || "").toLowerCase();
}

export function getAllowedTabsUi(ctx) {
  const { hasAccessSession, isGuestUser, isCommonUser } = ctx || {};
  if (!hasAccessSession()) return [];
  if (isGuestUser()) return ["home", "explore"];
  if (isCommonUser()) return ["home", "explore", "notifications", "profile", "settings"];
  return ["home", "explore", "notifications", "profile", "edit", "settings"];
}

export function isGuestUserUi(state) {
  return !!state.guestMode && !state.authUser;
}

export function isCommonUserUi(state) {
  const type = String((state.authUser && state.authUser.account_type) || "").toLowerCase();
  return !!state.authUser && type === "common";
}

export function isProfessionalUserUi(ctx) {
  const { state, getAccountType } = ctx || {};
  const type = getAccountType();
  return !!state.authUser && type !== "common";
}

function navIconSvg(tab) {
  if (tab === "home") {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3v-10.5Z' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>";
  }
  if (tab === "explore") {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><circle cx='11' cy='11' r='7' stroke='currentColor' stroke-width='2'/><path d='m20 20-3.5-3.5' stroke='currentColor' stroke-width='2' stroke-linecap='round'/></svg>";
  }
  if (tab === "notifications") {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M18 9a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/><path d='M10.7 21a2 2 0 0 0 2.6 0' stroke='currentColor' stroke-width='2' stroke-linecap='round'/></svg>";
  }
  if (tab === "profile") {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><circle cx='12' cy='8' r='4' stroke='currentColor' stroke-width='2'/><path d='M4 20c1.5-3.5 4.1-5 8-5s6.5 1.5 8 5' stroke='currentColor' stroke-width='2' stroke-linecap='round'/></svg>";
  }
  if (tab === "edit") {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M12 20h9' stroke='currentColor' stroke-width='2' stroke-linecap='round'/><path d='m16.5 3.5 4 4L8 20l-5 1 1-5 12.5-12.5Z' stroke='currentColor' stroke-width='2' stroke-linejoin='round'/></svg>";
  }
  return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><circle cx='12' cy='12' r='3' stroke='currentColor' stroke-width='2'/><path d='M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.2 1.2 0 0 1 0 1.7l-1.2 1.2a1.2 1.2 0 0 1-1.7 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.2 1.2 0 0 1-1.2 1.2h-1.7A1.2 1.2 0 0 1 10 20v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.2 1.2 0 0 1-1.7 0l-1.2-1.2a1.2 1.2 0 0 1 0-1.7l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4A1.2 1.2 0 0 1 2.8 13v-2A1.2 1.2 0 0 1 4 9.8h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.2 1.2 0 0 1 0-1.7l1.2-1.2a1.2 1.2 0 0 1 1.7 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4A1.2 1.2 0 0 1 10.7 2.8h2A1.2 1.2 0 0 1 14 4v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.2 1.2 0 0 1 1.7 0l1.2 1.2a1.2 1.2 0 0 1 0 1.7l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2A1.2 1.2 0 0 1 21.2 11v2A1.2 1.2 0 0 1 20 14.2h-.2a1 1 0 0 0-.4.8Z' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>";
}

function navButtonHtml(tab, label) {
  return "<span class=\"nav-btn-icon\" aria-hidden=\"true\">" + navIconSvg(tab) + "</span><span class=\"nav-btn-label\">" + String(label || "") + "</span>";
}

export function applyNavigationAccessUi(ctx) {
  const { el, getAllowedTabs, state, setState, NAV_LABELS } = ctx || {};
  if (!el.nav) return;
  const allowed = getAllowedTabs();
  const activeTab = allowed.includes(state.currentTab) ? state.currentTab : allowed[0] || "home";
  if (activeTab !== state.currentTab && allowed.length) {
    setState({ currentTab: activeTab });
  }
  el.nav.querySelectorAll("button[data-tab]").forEach((button) => {
    const tab = String(button.dataset.tab || "");
    const visible = allowed.includes(tab);
    button.style.display = visible ? "" : "none";
    button.classList.toggle("active", visible && tab === activeTab);
    if (visible) {
      const label = NAV_LABELS[tab] || button.textContent;
      button.innerHTML = navButtonHtml(tab, label);
    }
  });
}

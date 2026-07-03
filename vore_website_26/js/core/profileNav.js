export function selectedProfileUi(state) {
  return state.profiles.find((p) => p.id === state.selectedProfileId) || null;
}

export function getOwnProfileForAuthUserUi(state) {
  const authUserId = Number((state.authUser && state.authUser.id) || 0);
  if (!authUserId) return null;
  return state.profiles.find((p) => Number((p && p.userId) || 0) === authUserId) || null;
}

export function getNavActiveTabUi(state, profileNavActiveOverride) {
  if (state.currentTab === "profile" && profileNavActiveOverride) return profileNavActiveOverride;
  return state.currentTab;
}

export function resolveProfileOriginTabUi(ctx) {
  const { state, isCommonUser } = ctx || {};
  if (state.currentTab === "explore") return "explore";
  if (state.currentTab === "notifications") return "notifications";
  if (state.currentTab === "profile" && isCommonUser() && String(state.profileContext || "personal") !== "public") {
    return "profile";
  }
  return "home";
}

export function openPublicProfileUi(ctx, profileId, options = {}) {
  const { setState, incrementProfileView, isCommonUser, addRecentProfile, setScreen } = ctx || {};
  const pid = Number(profileId || 0);
  if (!(pid > 0)) return;
  const fromTabRaw = String((options && options.fromTab) || "home").trim();
  const fromTab =
    fromTabRaw === "explore" || fromTabRaw === "notifications" || fromTabRaw === "profile"
      ? fromTabRaw
      : "home";
  const shouldTrackView = options && options.trackView === false ? false : true;
  const shouldAddRecent = options && options.addRecent === false ? false : true;
  setState({ selectedProfileId: pid, profileContext: "public", profileReturnTab: fromTab });
  if (shouldTrackView) incrementProfileView(pid);
  if (isCommonUser() && shouldAddRecent) addRecentProfile(pid);
  setScreen("profile", { navActiveTab: fromTab });
}

export function ensureProfileTabUi(ctx, tabs) {
  const { state, setState } = ctx || {};
  const valid = (tabs || []).find((tab) => tab.id === state.profileTab);
  if (valid) return valid.id;
  const first = (tabs || [])[0];
  const next = first ? first.id : "sobre";
  setState({ profileTab: next, profileSubTab: "" });
  return next;
}

export function ensureSubTabUi(ctx, sections) {
  const { state, setState } = ctx || {};
  if (!Array.isArray(sections) || !sections.length) return "";
  const valid = sections.find((section) => section.id === state.profileSubTab || section.label === state.profileSubTab);
  if (valid) return valid.id || valid.label;
  const first = sections[0];
  const next = first.id || first.label || "";
  setState({ profileSubTab: next });
  return next;
}

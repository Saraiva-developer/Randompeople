let profileModalsInstance = null;

export function getProfileModalsUi(ctx) {
  if (!profileModalsInstance) {
    profileModalsInstance = ctx.createProfileModals(ctx.options || {});
  }
  return profileModalsInstance;
}

export function resetProfileModalsUi() {
  profileModalsInstance = null;
}

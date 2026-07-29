export type SavedMediaEntry = {
  key: string;
  type: "photo" | "video";
  uri: string;
  profileName: string;
  profileSlug: string;
  savedAt: string;
};

export type SavedItemEntry = {
  key: string;
  kind: string;
  section: string;
  name: string;
  note: string;
  price: string;
  oldPrice: string;
  image: string;
  profileName: string;
  profileSlug: string;
  savedAt: string;
};

/** Stable identity for a saved row, mirroring the app's entry_key usage. */
export function mediaEntryKey(profileSlug: string, uri: string) {
  return `media:${profileSlug}:${uri}`;
}

export function itemEntryKey(profileSlug: string, kind: string, section: string, name: string) {
  return `item:${profileSlug}:${kind}:${section}:${name}`.toLowerCase();
}

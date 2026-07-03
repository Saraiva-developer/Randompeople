export function getItemMediaListUi(ctx, tabId, item) {
  const { pick, inferMediaType, normalizeGalleryView, getMergedItemImages } = ctx || {};
  if (tabId === "galeria") {
    const src = pick(item, ["mediaUrl", "url", "image", "video"]);
    if (!src) return [];
    return [
      {
        url: src,
        type: inferMediaType(src, item && item.mediaType),
        galleryView: normalizeGalleryView(item && item.galleryView),
      },
    ];
  }
  if (tabId === "campanhas") {
    const src = pick(item, ["mediaUrl", "image", "cover", "thumbnail", "video"]);
    if (!src) return [];
    return [{ url: src, type: inferMediaType(src, item && item.mediaType) }];
  }
  if (
    tabId === "casas" ||
    tabId === "quartos" ||
    tabId === "produtos" ||
    tabId === "menu" ||
    tabId === "portfolio" ||
    tabId === "servicos"
  ) {
    const list = getMergedItemImages(item);
    if (list.length) return list.map((src) => ({ url: src, type: inferMediaType(src, "") }));
  }
  const src = pick(item, ["imageUrl", "image", "cover", "thumbnail", "video"]);
  if (!src) return [];
  return [{ url: src, type: inferMediaType(src, item && item.mediaType) }];
}

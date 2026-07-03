export function createModalReviewsFacade(ctx) {
  const { getProfileModals } = ctx;

  function closeItemModal() {
    return getProfileModals().closeItemModal();
  }

  function openItemModal(tabId, items, index, context = {}) {
    return getProfileModals().openItemModal(tabId, items, index, context);
  }

  function renderItemModal() {
    return getProfileModals().renderItemModal();
  }

  function closeReviewsModal() {
    return getProfileModals().closeReviewsModal();
  }

  async function loadReviews() {
    return getProfileModals().loadReviews();
  }

  async function submitReview() {
    return getProfileModals().submitReview();
  }

  function renderReviewsModal() {
    return getProfileModals().renderReviewsModal();
  }

  async function openReviewsModal() {
    return getProfileModals().openReviewsModal();
  }

  return {
    closeItemModal,
    openItemModal,
    renderItemModal,
    closeReviewsModal,
    loadReviews,
    submitReview,
    renderReviewsModal,
    openReviewsModal,
  };
}

"use client";

import { useRef } from "react";

export function LegacyVoreFrame() {
  const frameRef = useRef<HTMLIFrameElement>(null);

  function openEditProfileTab() {
    let attempts = 0;

    const timer = window.setInterval(() => {
      attempts += 1;

      const documentRoot = frameRef.current?.contentDocument;
      const editButton =
        documentRoot?.querySelector<HTMLButtonElement>('[data-tab="edit"]');

      if (editButton) {
        editButton.click();
        window.clearInterval(timer);
        return;
      }

      if (attempts >= 24) {
        window.clearInterval(timer);
      }
    }, 250);
  }

  return (
    <main className="legacy-vore-frame-page">
      <iframe
        ref={frameRef}
        className="legacy-vore-frame"
        src="/legacy-vore26/index.html?open=edit&v=20260510-mobile-dock-v2"
        title="Vore Website 26"
        onLoad={openEditProfileTab}
      />
    </main>
  );
}

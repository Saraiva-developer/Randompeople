"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORY_DURATION_MS = 5000;

function isVideoUrl(uri: string) {
  const raw = uri.toLowerCase();
  if (raw.startsWith("data:video/")) return true;
  return /\.(mp4|mov|webm|m4v|avi)(\?.*)?$/.test(raw);
}

export function ProfileStoryAvatar({
  avatar,
  name,
  stories
}: {
  avatar: string;
  name: string;
  stories: string[];
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = stories.length;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);

  const goTo = useCallback(
    (nextIndex: number) => {
      clearTimer();
      if (nextIndex >= total) {
        setOpen(false);
        return;
      }
      setIndex(Math.max(0, nextIndex));
      setProgressKey((key) => key + 1);
    },
    [clearTimer, total]
  );

  const current = stories[Math.max(0, Math.min(index, total - 1))] || "";
  const currentIsVideo = isVideoUrl(current);

  useEffect(() => {
    if (!open || currentIsVideo) return;
    timerRef.current = setTimeout(() => {
      goTo(index + 1);
    }, STORY_DURATION_MS);
    return clearTimer;
  }, [open, index, progressKey, currentIsVideo, goTo, clearTimer]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") goTo(index + 1);
      if (event.key === "ArrowLeft") goTo(index - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, index, close, goTo]);

  function openViewer() {
    if (!total) return;
    setIndex(0);
    setProgressKey((key) => key + 1);
    setOpen(true);
  }

  const avatarNode = avatar ? (
    <img className="profile-native-avatar" src={avatar} alt={name} />
  ) : (
    <div className="profile-native-avatar placeholder">{name.slice(0, 1).toUpperCase()}</div>
  );

  return (
    <>
      {total ? (
        <button
          type="button"
          className="story-avatar-btn"
          aria-label={`Ver stories de ${name}`}
          onClick={openViewer}
        >
          {avatarNode}
        </button>
      ) : (
        avatarNode
      )}

      {open && current ? (
        <div className="story-viewer-backdrop">
          <div className="story-viewer-progress-row">
            {stories.map((_, idx) => (
              <span key={idx} className="story-viewer-progress-track">
                <span
                  key={idx === index ? `active-${progressKey}` : `idle-${idx}`}
                  className={`story-viewer-progress-fill${
                    idx < index ? " is-done" : idx === index && !currentIsVideo ? " is-running" : ""
                  }`}
                  style={idx === index && !currentIsVideo ? { animationDuration: `${STORY_DURATION_MS}ms` } : undefined}
                />
              </span>
            ))}
          </div>

          <div className="story-viewer-top">
            <span className="story-viewer-name">{name}</span>
            <button type="button" className="story-viewer-close" aria-label="Fechar" onClick={close}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="story-viewer-stage">
            {currentIsVideo ? (
              <video
                key={current}
                className="story-viewer-media"
                src={current}
                autoPlay
                playsInline
                onEnded={() => goTo(index + 1)}
              />
            ) : (
              <img key={current} className="story-viewer-media" src={current} alt={name} />
            )}
            <button
              type="button"
              className="story-viewer-zone story-viewer-zone-left"
              aria-label="Anterior"
              onClick={() => goTo(index - 1)}
            />
            <button
              type="button"
              className="story-viewer-zone story-viewer-zone-right"
              aria-label="Seguinte"
              onClick={() => goTo(index + 1)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useEffect, useRef } from "react";

type VideoStreamPanelProps = {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  label: string;
  placeholderInitial?: string;
  placeholderName?: string;
  placeholderMeta?: string;
  showPlaceholder?: boolean;
  className?: string;
};

function bindStream(video: HTMLVideoElement | null, stream: MediaStream | null) {
  if (!video) return;
  if (video.srcObject === stream) return;
  video.srcObject = stream;
  if (stream) {
    void video.play().catch(() => {
      /* autoplay */
    });
  }
}

export function VideoStreamPanel({
  stream,
  muted = false,
  mirror = false,
  label,
  placeholderInitial,
  placeholderName,
  placeholderMeta,
  showPlaceholder = false,
  className = "",
}: VideoStreamPanelProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    bindStream(ref.current, stream);
  }, [stream]);

  return (
    <div className={`video-stream-panel ${className}`.trim()}>
      <video
        ref={ref}
        className={`video-stream-panel__video${mirror ? " video-stream-panel__video--mirror" : ""}${showPlaceholder ? " video-stream-panel__video--hidden" : ""}`}
        playsInline
        muted={muted}
        autoPlay
        aria-label={label}
      />

      {showPlaceholder && (
        <div className="video-stream-panel__placeholder">
          {placeholderInitial && (
            <div className="video-stream-panel__avatar">{placeholderInitial}</div>
          )}
          {placeholderName && (
            <span className="video-stream-panel__name">{placeholderName}</span>
          )}
          {placeholderMeta && (
            <span className="video-stream-panel__meta">{placeholderMeta}</span>
          )}
        </div>
      )}
    </div>
  );
}

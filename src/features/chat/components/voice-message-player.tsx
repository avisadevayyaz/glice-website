"use client";

import { Mic, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "../lib/resolve-media-url";

type VoiceMessagePlayerProps = {
  src: string;
  sent?: boolean;
  uploading?: boolean;
  durationHint?: number;
};

/** Mirrors Flutter AppUtils.formatTimeDuration — always MM:SS */
export function formatVoiceDuration(sec: number, unknown = false): string {
  if (unknown || !Number.isFinite(sec) || sec < 0) return "00:00";
  const total = Math.max(0, Math.round(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function buildWaveform(seed: string, count = 34): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Array.from({ length: count }, (_, i) => {
    const n = Math.abs(Math.sin((hash + i * 7.3) * 12.9898) * 43758.5453);
    return 0.28 + (n % 1) * 0.72;
  });
}

async function probeAudioDuration(url: string): Promise<number> {
  try {
    const res = await fetch(url);
    if (!res.ok) return 0;
    const buf = await res.arrayBuffer();
    const ctx = new AudioContext();
    try {
      const decoded = await ctx.decodeAudioData(buf.slice(0));
      return decoded.duration;
    } finally {
      void ctx.close();
    }
  } catch {
    return 0;
  }
}

export function VoiceMessagePlayer({
  src,
  sent = false,
  uploading = false,
  durationHint = 0,
}: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState(false);
  const resolved = resolveMediaUrl(src);
  const canPlay = Boolean(resolved) || uploading || durationHint > 0;
  const waveform = useMemo(
    () => buildWaveform(resolved || src || "voice"),
    [resolved, src],
  );

  const syncDuration = useCallback((el: HTMLAudioElement) => {
    const d = el.duration;
    if (Number.isFinite(d) && d > 0) {
      setDuration(d);
    }
  }, []);

  useEffect(() => {
    setPlaying(false);
    setDuration(0);
    setCurrent(0);
    setFailed(false);
  }, [resolved]);

  useEffect(() => {
    if (!resolved || duration > 0 || durationHint > 0) return;

    let cancelled = false;
    void probeAudioDuration(resolved).then((d) => {
      if (!cancelled && d > 0) setDuration(d);
    });

    return () => {
      cancelled = true;
    };
  }, [resolved, duration, durationHint]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !resolved || uploading) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play().then(() => setPlaying(true)).catch(() => setFailed(true));
    }
  }, [playing, resolved, uploading]);

  const effectiveDuration =
    duration > 0 ? duration : durationHint > 0 ? durationHint : 0;

  const progress =
    effectiveDuration > 0 ? (current / effectiveDuration) * 100 : 0;

  const displaySec = playing
    ? Math.max(0, effectiveDuration - current)
    : effectiveDuration;

  const timeLabel = formatVoiceDuration(
    displaySec,
    displaySec <= 0 && !uploading,
  );

  if (!canPlay || (failed && !uploading)) {
    return (
      <div className="chat-voice chat-voice--error">
        <Mic className="h-4 w-4 opacity-60" aria-hidden />
        <span className="text-xs">Voice unavailable</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "chat-voice",
        sent ? "chat-voice--sent" : "chat-voice--recv",
        uploading && "chat-voice--uploading",
        playing && "chat-voice--playing",
      )}
    >
      {resolved ? (
        <audio
          ref={audioRef}
          src={resolved}
          preload="metadata"
          onLoadedMetadata={(e) => syncDuration(e.currentTarget)}
          onDurationChange={(e) => syncDuration(e.currentTarget)}
          onCanPlayThrough={(e) => syncDuration(e.currentTarget)}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onEnded={() => {
            setPlaying(false);
            setCurrent(0);
            if (audioRef.current) audioRef.current.currentTime = 0;
          }}
          onError={() => {
            if (!uploading) setFailed(true);
          }}
        />
      ) : null}
      <span className="chat-voice-mic" aria-hidden>
        <Mic className="h-3.5 w-3.5" />
      </span>
      <button
        type="button"
        className="chat-voice-play"
        onClick={toggle}
        disabled={uploading || !resolved}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        {playing ? (
          <Pause className="h-[15px] w-[15px] fill-current" />
        ) : (
          <Play className="h-[15px] w-[15px] fill-current translate-x-[1px]" />
        )}
      </button>

      <div className="chat-voice-wave" aria-hidden="true">
        {waveform.map((h, i) => {
          const barProgress = (i / waveform.length) * 100;
          const played = barProgress <= progress;
          return (
            <span
              key={i}
              className={cn(
                "chat-voice-wave-bar",
                played && "chat-voice-wave-bar--played",
              )}
              style={{ height: `${Math.round(h * 100)}%` }}
            />
          );
        })}
      </div>

      <span className="chat-voice-time" aria-label={`Duration ${timeLabel}`}>
        {timeLabel}
      </span>
    </div>
  );
}

"use client";

import { AlertCircle, Check, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useSocketStore } from "../stores/socket-store";
import type { SocketConnectionPhase } from "../types";

const ACTIVE_PHASES = new Set<SocketConnectionPhase>([
  "connecting",
  "authenticating",
  "syncing",
  "reconnecting",
  "disconnected",
  "error",
  "success",
]);

type MorphPhase = "hidden" | "micro" | "compact" | "expanded" | "leaving";

const ISLAND_SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";

function phaseIcon(phase: SocketConnectionPhase, error: string | null) {
  if (phase === "success") {
    return <Check className="chat-island-icon-svg" strokeWidth={2.5} />;
  }
  if (phase === "error" || error) {
    return <AlertCircle className="chat-island-icon-svg" strokeWidth={2.25} />;
  }
  if (phase === "disconnected") {
    return <WifiOff className="chat-island-icon-svg" strokeWidth={2.25} />;
  }
  if (phase === "reconnecting") {
    return (
      <RefreshCw
        className="chat-island-icon-svg chat-island-icon-svg--spin"
        strokeWidth={2.25}
      />
    );
  }
  return (
    <Loader2
      className="chat-island-icon-svg chat-island-icon-svg--spin"
      strokeWidth={2.25}
    />
  );
}

export function ConnectionIsland() {
  const pathname = usePathname();
  const { phase, statusLabel, isIslandVisible, error } = useSocketStore();
  const onChat = pathname.startsWith("/messages");

  const shouldShow =
    onChat && isIslandVisible && ACTIVE_PHASES.has(phase);

  const [mounted, setMounted] = useState(false);
  const [morph, setMorph] = useState<MorphPhase>("hidden");
  const timers = useRef<number[]>([]);
  const wasVisible = useRef(false);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  useEffect(() => {
    clearTimers();

    if (shouldShow) {
      wasVisible.current = true;
      setMounted(true);
      setMorph("micro");
      schedule(() => setMorph("compact"), 140);
      schedule(() => setMorph("expanded"), 380);
      return clearTimers;
    }

    if (!wasVisible.current) return clearTimers;

    wasVisible.current = false;
    setMorph("compact");
    schedule(() => setMorph("micro"), 220);
    schedule(() => setMorph("leaving"), 380);
    schedule(() => {
      setMounted(false);
      setMorph("hidden");
    }, 680);

    return clearTimers;
  }, [shouldShow]);

  useEffect(() => {
    const root = document.querySelector(".chat-app");
    root?.classList.toggle(
      "chat-app--island-active",
      mounted && morph !== "hidden" && morph !== "leaving",
    );
    return () => root?.classList.remove("chat-app--island-active");
  }, [mounted, morph]);

  if (!mounted) return null;

  const isError = phase === "error" || Boolean(error);
  const isSuccess = phase === "success";
  const label = error ?? statusLabel ?? "Connecting";
  const showLabel = morph === "expanded" || morph === "leaving";

  return (
    <div
      className="chat-island-portal"
      style={{ ["--island-ease" as string]: ISLAND_SPRING }}
      aria-hidden={morph === "leaving"}
    >
      <div
        className={cn(
          "chat-island",
          morph !== "hidden" && `chat-island--${morph}`,
          isError && "chat-island--error",
          isSuccess && "chat-island--success",
          phase === "reconnecting" && "chat-island--warn",
        )}
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        <span className="chat-island-glow" aria-hidden="true" />
        <span className="chat-island-body">
          <span className="chat-island-icon">{phaseIcon(phase, error)}</span>
          <span
            className={cn(
              "chat-island-label",
              showLabel && "chat-island-label--visible",
            )}
          >
            {label}
          </span>
        </span>
      </div>
    </div>
  );
}

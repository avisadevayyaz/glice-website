import { create } from "zustand";
import type { SocketConnectionPhase } from "../types";

type SocketStore = {
  phase: SocketConnectionPhase;
  statusLabel: string;
  isIslandVisible: boolean;
  error: string | null;
  setPhase: (phase: SocketConnectionPhase, label?: string) => void;
  setError: (error: string | null) => void;
  hideIsland: () => void;
  reset: () => void;
};

const PHASE_LABELS: Record<SocketConnectionPhase, string> = {
  idle: "",
  connecting: "Connecting",
  connected: "Connected",
  authenticating: "Signing in",
  syncing: "Loading chats",
  ready: "",
  reconnecting: "Reconnecting",
  disconnected: "Offline",
  error: "Connection failed",
  success: "Ready",
};

let hideTimer: ReturnType<typeof setTimeout> | null = null;

const LOADING_PHASES: SocketConnectionPhase[] = [
  "connecting",
  "authenticating",
  "syncing",
  "reconnecting",
];

export const useSocketStore = create<SocketStore>((set, get) => ({
  phase: "idle",
  statusLabel: "",
  isIslandVisible: false,
  error: null,

  setPhase: (phase, label) => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    const statusLabel = label ?? PHASE_LABELS[phase];

    if (phase === "ready") {
      set({
        phase: "success",
        statusLabel: PHASE_LABELS.success,
        isIslandVisible: true,
        error: null,
      });
      hideTimer = setTimeout(() => {
        set({
          phase: "ready",
          statusLabel: "",
          isIslandVisible: false,
        });
        hideTimer = null;
      }, 650);
      return;
    }

    const showIsland =
      LOADING_PHASES.includes(phase) ||
      phase === "disconnected" ||
      phase === "error" ||
      (phase === "connected" && Boolean(label));

    set({
      phase,
      statusLabel,
      isIslandVisible: showIsland,
      error: phase === "error" ? get().error : null,
    });
  },

  setError: (error) =>
    set({
      error,
      phase: error ? "error" : get().phase,
      statusLabel: error ?? "Connection failed",
      isIslandVisible: Boolean(error),
    }),

  hideIsland: () => set({ isIslandVisible: false }),

  reset: () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    set({
      phase: "idle",
      statusLabel: "",
      isIslandVisible: false,
      error: null,
    });
  },
}));

import { create } from "zustand";
import { fetchRandomCallHistory } from "../api/call-history-api";
import type { RandomCallEntry, RandomCallFilter } from "../types";

const PAGE_LIMIT = 20;

type CallHistoryStore = {
  isOpen: boolean;
  entries: RandomCallEntry[];
  filter: RandomCallFilter;
  currentPage: number;
  totalPages: number;
  totalCalls: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasFetched: boolean;

  open: () => void;
  close: () => void;
  setFilter: (filter: RandomCallFilter) => void;
  fetchPage: (opts?: { reset?: boolean }) => Promise<void>;
  loadMore: () => Promise<void>;
  reset: () => void;
};

const dataState = {
  entries: [] as RandomCallEntry[],
  filter: "all" as RandomCallFilter,
  currentPage: 0,
  totalPages: 1,
  totalCalls: 0,
  loading: false,
  loadingMore: false,
  error: null as string | null,
  hasFetched: false,
};

function mergeEntries(
  existing: RandomCallEntry[],
  incoming: RandomCallEntry[],
  reset: boolean,
): RandomCallEntry[] {
  if (reset) return incoming;

  const seen = new Set(existing.map((entry) => entry.id));
  return [...existing, ...incoming.filter((entry) => !seen.has(entry.id))];
}

export const useCallHistoryStore = create<CallHistoryStore>((set, get) => ({
  isOpen: false,
  ...dataState,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  setFilter: (filter) => {
    if (filter === get().filter) return;
    set({
      ...dataState,
      isOpen: get().isOpen,
      filter,
    });
  },

  fetchPage: async ({ reset = true } = {}) => {
    const { filter, loading, loadingMore } = get();
    if (loading || loadingMore) return;

    const nextPage = reset ? 1 : get().currentPage + 1;
    set({
      loading: reset,
      loadingMore: !reset,
      error: null,
    });

    try {
      const result = await fetchRandomCallHistory({
        type: filter,
        currentPage: nextPage,
        limit: PAGE_LIMIT,
      });

      set((state) => ({
        entries: mergeEntries(state.entries, result.entries, reset),
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalCalls: result.totalCalls,
        loading: false,
        loadingMore: false,
        error: null,
        hasFetched: true,
      }));
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Could not load your call history";

      set({
        loading: false,
        loadingMore: false,
        error: message,
        hasFetched: true,
      });
    }
  },

  loadMore: async () => {
    const { currentPage, totalPages, loading, loadingMore } = get();
    if (loading || loadingMore || currentPage >= totalPages) return;
    await get().fetchPage({ reset: false });
  },

  reset: () => set({ isOpen: false, ...dataState }),
}));

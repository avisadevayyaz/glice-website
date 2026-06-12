"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sanitizeFilterId } from "../catalog";
import type { ArFilterId } from "../types";

const STORAGE_KEY = "glice-ar-filter";

type ArFilterState = {
  activeFilter: ArFilterId;
  loading: boolean;
  loadError: string | null;
  setActiveFilter: (id: ArFilterId) => void;
  setLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;
  reset: () => void;
};

export const useArFilterStore = create<ArFilterState>()(
  persist(
    (set) => ({
      activeFilter: "none",
      loading: false,
      loadError: null,
      setActiveFilter: (id) =>
        set({ activeFilter: sanitizeFilterId(id), loadError: null }),
      setLoading: (loading) => set({ loading }),
      setLoadError: (loadError) => set({ loadError }),
      reset: () =>
        set({
          activeFilter: "none",
          loading: false,
          loadError: null,
        }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        activeFilter: sanitizeFilterId(state.activeFilter),
      }),
    },
  ),
);

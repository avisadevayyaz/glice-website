"use client";

import { AR_FILTER_CATALOG } from "@/features/ar-filters/catalog";
import { useArFilterStore } from "@/features/ar-filters/stores/ar-filter-store";
import type { ArFilterId } from "@/features/ar-filters/types";
import { useEffect, useRef } from "react";

type ArFilterRailProps = {
  activeFilter: ArFilterId;
  visible: boolean;
  onSelect: (id: ArFilterId) => void;
};

export function ArFilterRail({
  activeFilter,
  visible,
  onSelect,
}: ArFilterRailProps) {
  const loading = useArFilterStore((s) => s.loading);
  const loadError = useArFilterStore((s) => s.loadError);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!visible) return;
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeFilter, visible]);

  if (!visible) return null;

  return (
    <div className="ar-filter-rail" role="toolbar" aria-label="Lens filters">
      <div className="ar-filter-rail-fade" aria-hidden />
      {loading && (
        <div className="ar-filter-rail-status" role="status">
          <i className="ri-loader-4-line ar-filter-spinner" aria-hidden />
        </div>
      )}
      {loadError && (
        <p className="ar-filter-rail-error" role="alert">
          {loadError}
        </p>
      )}
      <div className="ar-filter-rail-scroll">
        {AR_FILTER_CATALOG.map((filter) => {
          const selected = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              ref={selected ? activeRef : undefined}
              type="button"
              className={`ar-filter-lens${selected ? " is-active" : ""}`}
              aria-label={filter.label}
              aria-pressed={selected}
              disabled={loading && filter.id !== "none"}
              onClick={() => onSelect(filter.id)}
            >
              <span className="ar-filter-lens-ring">
                {filter.previewSrc ? (
                  <img
                    src={filter.previewSrc}
                    alt=""
                    className="ar-filter-lens-preview"
                    draggable={false}
                  />
                ) : (
                  <i className="ri-user-smile-line ar-filter-lens-none" aria-hidden />
                )}
              </span>
              <span className="ar-filter-lens-label">{filter.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function useArFilterUiState() {
  const loading = useArFilterStore((s) => s.loading);
  const loadError = useArFilterStore((s) => s.loadError);
  return { loading, loadError };
}

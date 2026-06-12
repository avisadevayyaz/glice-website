"use client";

import { useUiSession } from "@/components/site/ui-session-provider";
import { formatCallDuration, formatTimeAgo } from "@/features/video/lib/format";
import { useCallHistoryStore } from "@/features/video/stores/call-history-store";
import type { RandomCallEntry, RandomCallFilter } from "@/features/video/types";
import {
  Clock3,
  History,
  MapPin,
  RefreshCw,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

const FILTERS: { id: RandomCallFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "random", label: "Random" },
  { id: "spark", label: "Spark" },
];

function partnerInitial(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function RandomCallCard({ entry }: { entry: RandomCallEntry }) {
  const { partner, durationSec, timestamp, distance, liked } = entry;
  const durationLabel =
    durationSec > 0 ? formatCallDuration(durationSec) : "Brief call";

  return (
    <article className="random-call-card">
      <div className="random-call-card-media">
        {partner.profileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partner.profileUrl}
            alt=""
            className="random-call-card-avatar"
          />
        ) : (
          <div className="random-call-card-avatar random-call-card-avatar--fallback">
            {partnerInitial(partner.name)}
          </div>
        )}
        <span className="random-call-card-badge" aria-hidden="true">
          <Video className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="random-call-card-body">
        <div className="random-call-card-head">
          <h3>{partner.name}</h3>
          <time dateTime={timestamp.toISOString()}>{formatTimeAgo(timestamp)}</time>
        </div>

        <p className="random-call-card-meta">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          Random video · {durationLabel}
        </p>

        {distance && (
          <p className="random-call-card-distance">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {distance}
          </p>
        )}

        {liked && (
          <span className="random-call-card-liked">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Liked
          </span>
        )}
      </div>
    </article>
  );
}

export function RandomCallHistoryDrawer() {
  const { isLoggedIn } = useUiSession();
  const isOpen = useCallHistoryStore((s) => s.isOpen);
  const entries = useCallHistoryStore((s) => s.entries);
  const filter = useCallHistoryStore((s) => s.filter);
  const totalCalls = useCallHistoryStore((s) => s.totalCalls);
  const currentPage = useCallHistoryStore((s) => s.currentPage);
  const totalPages = useCallHistoryStore((s) => s.totalPages);
  const loading = useCallHistoryStore((s) => s.loading);
  const loadingMore = useCallHistoryStore((s) => s.loadingMore);
  const error = useCallHistoryStore((s) => s.error);
  const hasFetched = useCallHistoryStore((s) => s.hasFetched);
  const close = useCallHistoryStore((s) => s.close);
  const setFilter = useCallHistoryStore((s) => s.setFilter);
  const fetchPage = useCallHistoryStore((s) => s.fetchPage);
  const loadMore = useCallHistoryStore((s) => s.loadMore);

  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadLockRef = useRef(false);

  const refresh = useCallback(() => {
    void fetchPage({ reset: true });
  }, [fetchPage]);

  useEffect(() => {
    if (!isOpen || !isLoggedIn) return;
    void fetchPage({ reset: true });
  }, [isOpen, isLoggedIn, filter, fetchPage]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close]);

  useEffect(() => {
    const root = listRef.current;
    const target = sentinelRef.current;
    if (!root || !target || !isOpen) return;

    const observer = new IntersectionObserver(
      (records) => {
        if (!records[0]?.isIntersecting || loadLockRef.current) return;
        if (loading || loadingMore || currentPage >= totalPages) return;

        loadLockRef.current = true;
        void loadMore().finally(() => {
          loadLockRef.current = false;
        });
      },
      { root, rootMargin: "160px", threshold: 0 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [isOpen, currentPage, totalPages, loading, loadingMore, loadMore]);

  if (!isOpen) return null;

  return (
    <div className="random-call-history-root" role="presentation">
      <button
        type="button"
        className="random-call-history-backdrop"
        aria-label="Close history"
        onClick={close}
      />

      <aside
        className="random-call-history-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="randomCallHistoryTitle"
      >
        <header className="random-call-history-head">
          <div className="random-call-history-head-copy">
            <span className="random-call-history-eyebrow">
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              Random calls
            </span>
            <h2 id="randomCallHistoryTitle">History</h2>
            <p>
              {loading && !hasFetched
                ? "Loading your recent matches…"
                : `${totalCalls} ${totalCalls === 1 ? "call" : "calls"} on Glice`}
            </p>
          </div>

          <div className="random-call-history-head-actions">
            <button
              type="button"
              className="random-call-history-icon-btn"
              onClick={refresh}
              aria-label="Refresh history"
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              className="random-call-history-icon-btn"
              onClick={close}
              aria-label="Close history"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div
          className="random-call-history-filters"
          role="tablist"
          aria-label="Call history filters"
        >
          {FILTERS.map(({ id, label }) => {
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`random-call-history-filter${
                  active ? " random-call-history-filter--active" : ""
                }`}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div ref={listRef} className="random-call-history-list">
          {loading && !hasFetched ? (
            <div className="random-call-history-skeleton">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="random-call-card random-call-card--skeleton">
                  <div className="random-call-card-media">
                    <div className="random-call-card-avatar random-call-shimmer" />
                  </div>
                  <div className="random-call-card-body">
                    <div className="random-call-shimmer random-call-shimmer-line random-call-shimmer-line--wide" />
                    <div className="random-call-shimmer random-call-shimmer-line" />
                  </div>
                </div>
              ))}
            </div>
          ) : error && entries.length === 0 ? (
            <div className="random-call-history-empty">
              <div className="random-call-history-empty-icon">
                <History className="h-7 w-7" />
              </div>
              <p className="random-call-history-empty-title">Could not load history</p>
              <p className="random-call-history-empty-desc">{error}</p>
              <button
                type="button"
                className="random-call-history-empty-cta"
                onClick={refresh}
              >
                Try again
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="random-call-history-empty">
              <div className="random-call-history-empty-icon">
                <Video className="h-7 w-7" />
              </div>
              <p className="random-call-history-empty-title">No random calls yet</p>
              <p className="random-call-history-empty-desc">
                Start a live video session and your recent random matches will
                appear here.
              </p>
              <button
                type="button"
                className="random-call-history-empty-cta"
                onClick={close}
              >
                Start matching
              </button>
            </div>
          ) : (
            <>
              {entries.map((entry) => (
                <RandomCallCard key={entry.id} entry={entry} />
              ))}

              {(loadingMore || (loading && hasFetched)) && (
                <div className="random-call-history-loading-more" aria-hidden="true">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                </div>
              )}

              <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

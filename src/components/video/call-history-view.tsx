"use client";

import { useUiSession } from "@/components/site/ui-session-provider";
import { formatCallDuration, formatTimeAgo } from "@/features/video/lib/format";
import { useCallHistoryStore } from "@/features/video/stores/call-history-store";
import type { RandomCallEntry, RandomCallFilter } from "@/features/video/types";
import {
  Clock3,
  Heart,
  MapPin,
  RefreshCw,
  Sparkles,
  UserRound,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

const FILTERS: { id: RandomCallFilter; label: string }[] = [
  { id: "all", label: "All calls" },
  { id: "random", label: "Random" },
  { id: "spark", label: "Spark" },
];

function partnerInitial(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function callTypeLabel(type?: RandomCallFilter) {
  if (type === "spark") return "Spark dating";
  if (type === "random") return "Random video";
  return "Video call";
}

function genderLabel(gender?: string) {
  if (!gender) return null;
  const value = gender.toLowerCase();
  if (value === "man" || value === "male") return "Man";
  if (value === "woman" || value === "female") return "Woman";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}

function CallHistoryCard({ entry }: { entry: RandomCallEntry }) {
  const { partner, durationSec, timestamp, distance, liked, callType } = entry;
  const durationLabel =
    durationSec > 0 ? formatCallDuration(durationSec) : "Brief call";

  return (
    <article className="call-history-card">
      <div className="call-history-card-visual">
        {partner.profileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partner.profileUrl}
            alt=""
            className="call-history-card-photo"
          />
        ) : (
          <div className="call-history-card-photo call-history-card-photo--fallback">
            {partnerInitial(partner.name)}
          </div>
        )}
        <div className="call-history-card-visual-gradient" aria-hidden />
        <div className="call-history-card-badges">
          <span className="call-history-card-type">
            <Video className="h-3.5 w-3.5" aria-hidden />
            {callTypeLabel(callType)}
          </span>
          {partner.isActive && (
            <span className="call-history-card-online">Online</span>
          )}
        </div>
      </div>

      <div className="call-history-card-content">
        <div className="call-history-card-head">
          <div>
            <h3>{partner.name}</h3>
            {partner.username && (
              <p className="call-history-card-username">@{partner.username}</p>
            )}
          </div>
          <time dateTime={timestamp.toISOString()}>
            {formatTimeAgo(timestamp)}
          </time>
        </div>

        <div className="call-history-card-meta-row">
          {partner.age ? (
            <span>
              <UserRound className="h-3.5 w-3.5" aria-hidden />
              {partner.age}
              {genderLabel(partner.gender)
                ? ` · ${genderLabel(partner.gender)}`
                : ""}
            </span>
          ) : null}
          <span>
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            {durationLabel}
          </span>
        </div>

        {partner.bio && (
          <p className="call-history-card-bio">{partner.bio}</p>
        )}

        {partner.interests && partner.interests.length > 0 && (
          <div className="call-history-card-tags">
            {partner.interests.slice(0, 4).map((interest) => (
              <span key={interest} className="call-history-card-tag">
                {interest}
              </span>
            ))}
          </div>
        )}

        <div className="call-history-card-footer">
          {distance && (
            <span className="call-history-card-distance">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {distance}
            </span>
          )}
          {liked && (
            <span className="call-history-card-liked">
              <Heart className="h-3.5 w-3.5" aria-hidden />
              Liked
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

type CallHistoryViewProps = {
  layout?: "page" | "drawer";
};

export function CallHistoryView({ layout = "page" }: CallHistoryViewProps) {
  const { isLoggedIn, openAuth } = useUiSession();
  const entries = useCallHistoryStore((s) => s.entries);
  const filter = useCallHistoryStore((s) => s.filter);
  const totalCalls = useCallHistoryStore((s) => s.totalCalls);
  const currentPage = useCallHistoryStore((s) => s.currentPage);
  const totalPages = useCallHistoryStore((s) => s.totalPages);
  const loading = useCallHistoryStore((s) => s.loading);
  const loadingMore = useCallHistoryStore((s) => s.loadingMore);
  const error = useCallHistoryStore((s) => s.error);
  const hasFetched = useCallHistoryStore((s) => s.hasFetched);
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
    if (!isLoggedIn) return;
    void fetchPage({ reset: true });
  }, [isLoggedIn, filter, fetchPage]);

  useEffect(() => {
    const root = listRef.current;
    const target = sentinelRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      (records) => {
        if (!records[0]?.isIntersecting || loadLockRef.current) return;
        if (loading || loadingMore || currentPage >= totalPages) return;

        loadLockRef.current = true;
        void loadMore().finally(() => {
          loadLockRef.current = false;
        });
      },
      { root, rootMargin: "200px", threshold: 0 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [currentPage, totalPages, loading, loadingMore, loadMore]);

  if (!isLoggedIn) {
    return (
      <div className="call-history-empty-state">
        <Sparkles className="h-8 w-8" aria-hidden />
        <h2>Sign in to view your call history</h2>
        <p>Your recent random and spark video calls appear here.</p>
        <button type="button" className="call-history-cta" onClick={() => openAuth("login")}>
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className={`call-history-view call-history-view--${layout}`}>
      <div className="call-history-toolbar">
        <div
          className="call-history-filters"
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
                className={`call-history-filter${active ? " call-history-filter--active" : ""}`}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="call-history-refresh"
          onClick={refresh}
          disabled={loading}
          aria-label="Refresh history"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <p className="call-history-summary">
        {loading && !hasFetched
          ? "Loading your recent calls…"
          : `${totalCalls} ${totalCalls === 1 ? "call" : "calls"} recorded`}
      </p>

      <div ref={listRef} className="call-history-grid">
        {loading && !hasFetched ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="call-history-card call-history-card--skeleton">
              <div className="call-history-shimmer call-history-shimmer-photo" />
              <div className="call-history-shimmer call-history-shimmer-line call-history-shimmer-line--wide" />
              <div className="call-history-shimmer call-history-shimmer-line" />
            </div>
          ))
        ) : error && entries.length === 0 ? (
          <div className="call-history-empty-state call-history-empty-state--inline">
            <h2>Could not load history</h2>
            <p>{error}</p>
            <button type="button" className="call-history-cta" onClick={refresh}>
              Try again
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="call-history-empty-state call-history-empty-state--inline">
            <Video className="h-8 w-8" aria-hidden />
            <h2>No calls yet</h2>
            <p>Start a live video session and your matches will show up here.</p>
            <Link href="/" className="call-history-cta">
              Start matching
            </Link>
          </div>
        ) : (
          <>
            {entries.map((entry) => (
              <CallHistoryCard key={entry.id} entry={entry} />
            ))}
            {(loadingMore || (loading && hasFetched)) && (
              <div className="call-history-loading-more" aria-hidden>
                <RefreshCw className="h-4 w-4 animate-spin" />
              </div>
            )}
            <div ref={sentinelRef} className="call-history-sentinel" aria-hidden />
          </>
        )}
      </div>
    </div>
  );
}

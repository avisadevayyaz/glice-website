"use client";

import {
  getRawMediaStream,
  setPublishedMediaStream,
  subscribeRawMediaStream,
} from "@/features/video/hooks/use-media-stream";
import { peerService } from "@/features/video/services/peer-service";
import { useCallback, useEffect, useRef } from "react";
import { getArFilterPipeline } from "../pipeline";
import { useArFilterStore } from "../stores/ar-filter-store";
import type { ArFilterId } from "../types";

type UseArFiltersOptions = {
  enabled: boolean;
};

export function useArFilters({ enabled }: UseArFiltersOptions) {
  const activeFilter = useArFilterStore((s) => s.activeFilter);
  const setActiveFilter = useArFilterStore((s) => s.setActiveFilter);
  const setLoading = useArFilterStore((s) => s.setLoading);
  const setLoadError = useArFilterStore((s) => s.setLoadError);
  const activeFilterRef = useRef(activeFilter);
  activeFilterRef.current = activeFilter;

  const publishStream = useCallback((stream: MediaStream | null) => {
    setPublishedMediaStream(stream);
    if (stream) {
      peerService.setLocalStream(stream);
      peerService.replaceLocalVideoTrack(stream);
    }
  }, []);

  const applyPipeline = useCallback(
    async (rawStream: MediaStream, filterId: ArFilterId) => {
      setLoading(true);
      setLoadError(null);

      try {
        const pipeline = getArFilterPipeline();

        if (filterId === "none") {
          pipeline.stop();
          publishStream(rawStream);
          return;
        }

        const output = await pipeline.start(rawStream, filterId);
        publishStream(output);
      } catch (err) {
        console.warn("[AR] Filter pipeline failed:", err);
        setLoadError("Could not load AR filter. Using original camera.");
        setActiveFilter("none");
        getArFilterPipeline().stop();
        publishStream(rawStream);
      } finally {
        setLoading(false);
      }
    },
    [publishStream, setActiveFilter, setLoadError, setLoading],
  );

  const switchFilter = useCallback(
    (filterId: ArFilterId) => {
      setActiveFilter(filterId);
    },
    [setActiveFilter],
  );

  useEffect(() => {
    if (!enabled) {
      getArFilterPipeline().stop();
      const raw = getRawMediaStream();
      if (raw) publishStream(raw);
      return;
    }

    let cancelled = false;

    const sync = async (raw: MediaStream, filterId: ArFilterId) => {
      if (cancelled) return;

      if (filterId === "none") {
        getArFilterPipeline().stop();
        publishStream(raw);
        return;
      }

      const pipeline = getArFilterPipeline();
      const existing = pipeline.getOutputStream();

      if (existing && pipeline.getActiveFilter() !== "none") {
        setLoading(true);
        try {
          await pipeline.setFilter(filterId);
          publishStream(existing);
        } catch {
          await applyPipeline(raw, filterId);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      await applyPipeline(raw, filterId);
    };

    const raw = getRawMediaStream();
    if (raw) void sync(raw, activeFilter);

    const unsub = subscribeRawMediaStream((stream) => {
      if (!stream) return;
      void sync(stream, activeFilterRef.current);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [
    enabled,
    activeFilter,
    applyPipeline,
    publishStream,
    setLoading,
  ]);

  return {
    activeFilter,
    switchFilter,
  };
}

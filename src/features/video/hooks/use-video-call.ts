"use client";

import { useUiSession } from "@/components/site/ui-session-provider";
import { getSharedMediaStream } from "@/features/video/hooks/use-media-stream";
import { sparkVideoService } from "@/features/video/services/spark-video-service";
import { useVideoCallStore } from "@/features/video/stores/video-call-store";
import type { VideoFilterInput } from "@/features/video/types";
import { useCallback, useEffect, useRef } from "react";

export function useVideoCall() {
  const { user, isLoggedIn } = useUiSession();
  const boundRef = useRef(false);

  const stage = useVideoCallStore((s) => s.stage);
  const partner = useVideoCallStore((s) => s.partner);
  const messages = useVideoCallStore((s) => s.messages);
  const remoteStream = useVideoCallStore((s) => s.remoteStream);
  const remoteVideoOn = useVideoCallStore((s) => s.remoteVideoOn);
  const isLocalPrimary = useVideoCallStore((s) => s.isLocalPrimary);
  const searchSecondsLeft = useVideoCallStore((s) => s.searchSecondsLeft);
  const callSecondsLeft = useVideoCallStore((s) => s.callSecondsLeft);
  const roundsLeft = useVideoCallStore((s) => s.roundsLeft);
  const error = useVideoCallStore((s) => s.error);
  const onlineCount = useVideoCallStore((s) => s.onlineCount);
  const endedByMe = useVideoCallStore((s) => s.endedByMe);
  const feedbackPhase = useVideoCallStore((s) => s.feedbackPhase);
  const mutualMatch = useVideoCallStore((s) => s.mutualMatch);
  const matchedRoomId = useVideoCallStore((s) => s.matchedRoomId);
  const toggleLayout = useVideoCallStore((s) => s.toggleLayout);

  useEffect(() => {
    if (!isLoggedIn || !user?._id) {
      if (boundRef.current) {
        sparkVideoService.unbind();
        const store = useVideoCallStore.getState();
        store.setStage("idle");
        store.resetCall();
        store.setError(null);
        boundRef.current = false;
      }
      return;
    }

    if (boundRef.current) return;
    boundRef.current = true;

    void sparkVideoService.prepare(user);
    sparkVideoService.bind(user, {
      getLocalStream: () => getSharedMediaStream(),
    });

    return () => {
      sparkVideoService.unbind();
      boundRef.current = false;
    };
  }, [isLoggedIn, user?._id, user?.email, user?.membership?.planId]);

  const startSearch = useCallback(
    (filter: VideoFilterInput) => {
      void sparkVideoService.startSearch(filter);
    },
    [],
  );

  const cancelSearch = useCallback(() => {
    sparkVideoService.cancelSearch();
  }, []);

  const endCall = useCallback(() => {
    sparkVideoService.endCall();
  }, []);

  const nextPerson = useCallback(() => {
    sparkVideoService.nextPerson();
  }, []);

  const submitFeedback = useCallback((liked: boolean | null) => {
    sparkVideoService.submitFeedback(liked);
  }, []);

  const sendMessage = useCallback((text: string) => {
    sparkVideoService.sendChatMessage(text);
  }, []);

  const notifyVideoState = useCallback((isVideo: boolean) => {
    sparkVideoService.notifyVideoState(isVideo);
  }, []);

  return {
    stage,
    partner,
    messages,
    remoteStream,
    remoteVideoOn,
    isLocalPrimary,
    searchSecondsLeft,
    callSecondsLeft,
    roundsLeft,
    error,
    onlineCount,
    endedByMe,
    feedbackPhase,
    mutualMatch,
    matchedRoomId,
    toggleLayout,
    startSearch,
    cancelSearch,
    endCall,
    nextPerson,
    submitFeedback,
    sendMessage,
    notifyVideoState,
  };
}

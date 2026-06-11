"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMessageStore } from "../stores/message-store";
import type { ChatMessage } from "../types";

const NEAR_BOTTOM_THRESHOLD = 140;

type UseMessageScrollOptions = {
  roomId: string;
  messages: ChatMessage[];
  userId?: string;
  typing?: boolean;
  isLoading?: boolean;
};

export function useMessageScroll({
  roomId,
  messages,
  userId,
  typing = false,
  isLoading = false,
}: UseMessageScrollOptions) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);
  const prevScrollHeightRef = useRef(0);
  const scrollEventRef = useRef(useMessageStore.getState().scrollEvent);
  const stickToBottomRef = useRef(true);

  const messageCount = messages.length;
  const lastSender = messages[messageCount - 1]?.sender;

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return (
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD
    );
  }, []);

  const jumpToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const scheduleScrollToBottom = useCallback(
    (instant = true) => {
      const run = () => {
        const el = scrollRef.current;
        if (!el) return;
        if (instant) {
          el.scrollTop = el.scrollHeight;
        } else {
          el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        }
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(run);
      });
      window.setTimeout(run, 60);
      window.setTimeout(run, 180);
      window.setTimeout(run, 420);
    },
    [],
  );

  useEffect(() => {
    const unsub = useMessageStore.subscribe((state) => {
      if (state.activeRoomId === roomId) {
        scrollEventRef.current = state.scrollEvent;
      }
    });
    return unsub;
  }, [roomId]);

  useEffect(() => {
    stickToBottomRef.current = true;
    prevLengthRef.current = 0;
    prevScrollHeightRef.current = 0;
    scheduleScrollToBottom(true);
  }, [roomId, scheduleScrollToBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      stickToBottomRef.current = isNearBottom();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [roomId, isNearBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      if (stickToBottomRef.current || isNearBottom()) {
        jumpToBottom();
      }
    });

    ro.observe(el);
    for (const child of Array.from(el.children)) {
      ro.observe(child);
    }

    return () => ro.disconnect();
  }, [roomId, messageCount, typing, jumpToBottom, isNearBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollEvent = scrollEventRef.current;
    const prevLen = prevLengthRef.current;
    const newLen = messageCount;
    const grew = newLen > prevLen;
    const prepended = grew && scrollEvent === "none" && prevLen > 0;

    if (prepended && prevScrollHeightRef.current > 0) {
      const delta = el.scrollHeight - prevScrollHeightRef.current;
      el.scrollTop += delta;
    } else if (grew) {
      const ownMessage = lastSender === userId;
      if (scrollEvent === "jump" || (prevLen === 0 && newLen > 0)) {
        stickToBottomRef.current = true;
        scheduleScrollToBottom(true);
      } else if (
        scrollEvent === "animate" &&
        (stickToBottomRef.current || isNearBottom() || ownMessage)
      ) {
        scheduleScrollToBottom(false);
      }
    }

    prevLengthRef.current = newLen;
    prevScrollHeightRef.current = el.scrollHeight;

    if (scrollEvent !== "none") {
      useMessageStore.getState().clearScrollEvent();
    }
  }, [
    messageCount,
    lastSender,
    userId,
    isNearBottom,
    scheduleScrollToBottom,
  ]);

  useEffect(() => {
    if (!typing) return;
    if (stickToBottomRef.current || isNearBottom()) {
      scheduleScrollToBottom(false);
    }
  }, [typing, isNearBottom, scheduleScrollToBottom]);

  useEffect(() => {
    if (isLoading) return;
    if (messageCount === 0) return;
    if (stickToBottomRef.current) {
      scheduleScrollToBottom(true);
    }
  }, [isLoading, messageCount, scheduleScrollToBottom]);

  const beforeLoadMore = useCallback(() => {
    const el = scrollRef.current;
    if (el) prevScrollHeightRef.current = el.scrollHeight;
  }, []);

  return { scrollRef, isNearBottom, scrollToBottom, beforeLoadMore };
}

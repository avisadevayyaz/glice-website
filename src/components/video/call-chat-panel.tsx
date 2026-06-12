"use client";

import type { VideoChatMessage } from "@/features/video/types";
import { useEffect, useRef, useState } from "react";

type CallChatPanelProps = {
  partnerName: string;
  active: boolean;
  messages: VideoChatMessage[];
  layoutSide?: "left" | "right";
  onSend: (text: string) => void;
};

export function CallChatPanel({
  partnerName,
  active,
  messages,
  layoutSide = "right",
  onSend,
}: CallChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) {
      setDraft("");
      setExpanded(true);
    }
  }, [active]);

  useEffect(() => {
    if (!expanded || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, expanded]);

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !active) return;
    onSend(text);
    setDraft("");
    setExpanded(true);
  };

  if (!active) return null;

  const lastMessage = messages[messages.length - 1];

  return (
    <div
      className={`hero-chat-dock hero-chat-dock--${layoutSide}${expanded ? " hero-chat-dock--expanded" : ""}`}
      aria-label={`Chat with ${partnerName}`}
    >
      <div className="hero-chat-scrim" aria-hidden />

      {!expanded ? (
        <button
          type="button"
          className="hero-chat-pill"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
        >
          <i className="ri-chat-3-fill" aria-hidden />
          <span className="hero-chat-pill-text">
            {lastMessage
              ? `${lastMessage.isMine ? "You" : partnerName}: ${lastMessage.text}`
              : `Chat with ${partnerName}`}
          </span>
          <span className="hero-chat-pill-count">{messages.length}</span>
        </button>
      ) : (
        <div className="hero-chat-float">
          <div className="hero-chat-float-head">
            <div className="hero-chat-float-title">
              <i className="ri-chat-smile-3-line" aria-hidden />
              <span>{partnerName}</span>
            </div>
            <button
              type="button"
              className="hero-chat-float-min"
              onClick={() => setExpanded(false)}
              aria-label="Minimize chat"
            >
              <i className="ri-subtract-line" aria-hidden />
            </button>
          </div>

          <div className="hero-chat-float-messages" ref={listRef}>
            {messages.length === 0 ? (
              <p className="hero-chat-empty">Say hi to start chatting</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`hero-chat-float-bubble hero-chat-float-bubble--${message.isMine ? "you" : "partner"}`}
                >
                  <span className="hero-chat-float-bubble-text">
                    {message.text}
                  </span>
                  <time>{message.time}</time>
                </div>
              ))
            )}
          </div>

          <form
            className="hero-chat-float-input"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              type="text"
              placeholder="Say something…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={280}
              aria-label="Message"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send"
            >
              <i className="ri-send-plane-2-fill" aria-hidden />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

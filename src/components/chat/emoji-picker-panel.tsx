"use client";

import EmojiPicker, { Theme } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";

type EmojiPickerPanelProps = {
  open: boolean;
  onEmojiClick: (emoji: string) => void;
};

export function EmojiPickerPanel({ open, onEmojiClick }: EmojiPickerPanelProps) {
  if (!open) return null;

  const handleClick = (data: EmojiClickData) => {
    onEmojiClick(data.emoji);
  };

  return (
    <div className="chat-emoji-panel border-t border-border bg-card">
      <EmojiPicker
        theme={Theme.DARK}
        onEmojiClick={handleClick}
        width="100%"
        height={280}
        searchPlaceholder="Search emoji…"
        previewConfig={{ showPreview: false }}
        lazyLoadEmojis
      />
    </div>
  );
}

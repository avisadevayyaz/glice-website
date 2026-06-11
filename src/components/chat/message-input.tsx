"use client";

import { Mic, Paperclip, Send, Smile, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmojiPickerPanel } from "./emoji-picker-panel";

type ChatMessageInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAttach?: () => void;
  onVoiceStart?: () => void;
  onVoiceStop?: () => void;
  onVoiceCancel?: () => void;
  isRecording?: boolean;
  recordingDuration?: number;
  showEmoji?: boolean;
  onToggleEmoji?: () => void;
  onEmojiPick?: (emoji: string) => void;
  error?: string | null;
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ChatMessageInput({
  value,
  onChange,
  onSubmit,
  onAttach,
  onVoiceStart,
  onVoiceStop,
  onVoiceCancel,
  isRecording = false,
  recordingDuration = 0,
  showEmoji = false,
  onToggleEmoji,
  onEmojiPick,
  error,
}: ChatMessageInputProps) {
  const canSend = value.trim().length > 0 && !isRecording;

  if (isRecording) {
    return (
      <div className="chat-recording-bar">
        <div className="chat-recording-inner">
          <span className="chat-recording-dot" aria-hidden="true" />
          <div className="chat-recording-waves" aria-hidden="true">
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                className="chat-recording-wave"
                style={{ animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
          <span className="chat-recording-time">
            {formatDuration(recordingDuration)}
          </span>
          <button
            type="button"
            className="chat-recording-cancel"
            onClick={onVoiceCancel}
            aria-label="Cancel recording"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="chat-recording-send"
            onClick={onVoiceStop}
            aria-label="Send voice message"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            <span className="chat-recording-send-label">Send</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-composer-bar">
      {onEmojiPick && (
        <EmojiPickerPanel open={showEmoji} onEmojiClick={onEmojiPick} />
      )}
      {error && (
        <p className="mb-2 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
      <div className="chat-composer-inner">
        <div className="chat-composer-tools">
          {onToggleEmoji && (
            <button
              type="button"
              className={cn(
                "chat-composer-tool",
                showEmoji && "chat-composer-tool--active",
              )}
              onClick={onToggleEmoji}
              aria-label="Emoji"
            >
              <Smile className="h-[18px] w-[18px]" />
            </button>
          )}
          {onAttach && (
            <button
              type="button"
              className="chat-composer-tool"
              onClick={onAttach}
              aria-label="Attach"
            >
              <Paperclip className="h-[18px] w-[18px]" />
            </button>
          )}
          {onVoiceStart && (
            <button
              type="button"
              className="chat-composer-tool chat-composer-tool--mic"
              onClick={onVoiceStart}
              aria-label="Voice message"
            >
              <Mic className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>

        <textarea
          className="chat-composer-field"
          placeholder="Message..."
          rows={1}
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="on"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSubmit();
            }
          }}
        />

        <button
          type="button"
          className="chat-composer-send"
          disabled={!canSend}
          onClick={onSubmit}
          aria-label="Send message"
        >
          <Send className="chat-composer-send-icon h-4 w-4 md:hidden" aria-hidden />
          <span className="chat-composer-send-label">Send</span>
        </button>
      </div>
    </div>
  );
}

"use client";

import { ChatMessageInput } from "@/components/chat/message-input";
import { useUiSession } from "@/components/site/ui-session-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { uploadChatMedia } from "../api/attachment-upload";
import { useVoiceRecorder } from "../hooks/use-voice-recorder";
import { captureVideoThumbnail } from "../lib/video-thumbnail";
import { chatSocket } from "../services/socket-service";
import { useMessageStore } from "../stores/message-store";
import { useRoomStore } from "../stores/room-store";
import type { ChatAttachment, ChatMessage, ChatRoom } from "../types";

type MessageComposerProps = {
  room: ChatRoom;
};

function newMessageId(): string {
  return crypto.randomUUID();
}

function fileAttachmentType(file: File): ChatAttachment["type"] {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

function attachmentPreviewText(type: ChatAttachment["type"]): string {
  if (type === "image") return "sent an image 📷";
  if (type === "video") return "sent a video 🎥";
  return "sent audio 🔉";
}

export function MessageComposer({ room }: MessageComposerProps) {
  const { user } = useUiSession();
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentTypingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const voice = useVoiceRecorder();

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      sentTypingRef.current = false;
    };
  }, []);

  const trackBlob = useCallback((url: string) => {
    if (url.startsWith("blob:")) blobUrlsRef.current.add(url);
  }, []);

  const revokeBlob = useCallback((url?: string) => {
    if (!url?.startsWith("blob:")) return;
    URL.revokeObjectURL(url);
    blobUrlsRef.current.delete(url);
  }, []);

  const handleTyping = useCallback(() => {
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    if (!sentTypingRef.current) {
      chatSocket.sendTyping(room.roomId, room.otherUser.email);
      sentTypingRef.current = true;
    }

    typingTimer.current = setTimeout(() => {
      sentTypingRef.current = false;
      typingTimer.current = null;
    }, 3500);
  }, [room.roomId, room.otherUser.email]);

  useEffect(() => {
    if (!voice.isRecording) return;
    handleTyping();
    const interval = window.setInterval(() => handleTyping(), 3200);
    return () => window.clearInterval(interval);
  }, [voice.isRecording, handleTyping]);

  const sendMediaFile = useCallback(
    async (
      file: File,
      type: ChatAttachment["type"],
      audioDurationSec?: number,
    ) => {
      if (!user) return;

      const attachmentId = newMessageId();
      const localPreview = URL.createObjectURL(file);
      trackBlob(localPreview);

      let videoThumb = "";
      if (type === "video") {
        try {
          videoThumb = await captureVideoThumbnail(file);
        } catch {
          videoThumb = "";
        }
      }

      const optimisticAttachment: ChatAttachment = {
        id: attachmentId,
        url: localPreview,
        thumbnail:
          type === "image" || type === "audio"
            ? localPreview
            : videoThumb || localPreview,
        localPreview,
        type,
        size: file.size,
        title: "Chat",
        userId: user._id,
        pinned: false,
        isAdult: false,
        uploadProgress: 0,
        audioDurationSec:
          type === "audio" ? audioDurationSec : undefined,
      };

      const optimisticMessage: ChatMessage = {
        id: attachmentId,
        roomId: room.roomId,
        sender: user._id,
        recipient: room.otherUser.uid,
        text: "",
        timestamp: new Date(),
        status: "sending",
        attachment: optimisticAttachment,
      };

      useMessageStore.getState().addMessage(optimisticMessage);
      useRoomStore.getState().updateRoom({
        roomId: room.roomId,
        time: optimisticMessage.timestamp,
        isNew: false,
        currentUserId: user._id,
        recentMessage: {
          sender: optimisticMessage.sender,
          text: attachmentPreviewText(type),
          unsend: false,
        },
      });
      setUploadError(null);

      try {
        const uploaded = await uploadChatMedia(file, type, user._id, {
          videoThumbnail: videoThumb,
          onProgress: (pct) => {
            useMessageStore.getState().updateMessage(room.roomId, attachmentId, {
              attachment: { uploadProgress: Math.round(pct) },
            });
          },
        });

        if (!uploaded.url?.startsWith("http")) {
          throw new Error("Upload succeeded but no public URL returned");
        }

        const remoteUrl = uploaded.url;
        const remoteThumb = uploaded.thumbnail || remoteUrl;

        const finalAttachment: ChatAttachment = {
          id: "",
          url: remoteUrl,
          thumbnail: remoteThumb,
          type,
          size: file.size,
          title: "Chat",
          userId: user._id,
          pinned: false,
          isAdult: uploaded.isAdult,
          audioDurationSec:
            type === "audio" ? audioDurationSec : undefined,
        };

        const finalMessage: ChatMessage = {
          ...optimisticMessage,
          status: "delivered",
          attachment: finalAttachment,
        };

        useMessageStore.getState().addMessage(finalMessage, true);

        chatSocket.sendMessage({
          message: finalMessage,
          recipientEmail: room.otherUser.email,
          senderEmail: user.email,
          username: user.name ?? user.username ?? "User",
        });

        useRoomStore.getState().updateRoom({
          roomId: room.roomId,
          time: finalMessage.timestamp,
          isNew: false,
          currentUserId: user._id,
          recentMessage: {
            sender: finalMessage.sender,
            text: attachmentPreviewText(type),
            unsend: false,
          },
        });

        if (localPreview) {
          window.setTimeout(() => revokeBlob(localPreview), 12_000);
        }
      } catch (err) {
        useMessageStore.getState().deleteMessage(room.roomId, attachmentId);
        if (localPreview) revokeBlob(localPreview);
        setUploadError(
          err instanceof Error ? err.message : "Upload failed. Try again.",
        );
      }
    },
    [user, room, trackBlob, revokeBlob],
  );

  const sendTextMessage = useCallback(() => {
    if (!user || !text.trim()) return;

    const message: ChatMessage = {
      id: newMessageId(),
      roomId: room.roomId,
      sender: user._id,
      recipient: room.otherUser.uid,
      text: text.trim(),
      timestamp: new Date(),
      status: "delivered",
    };

    chatSocket.sendMessage({
      message,
      recipientEmail: room.otherUser.email,
      senderEmail: user.email,
      username: user.name ?? user.username ?? "User",
    });

    useMessageStore.getState().addMessage(message);
    useRoomStore.getState().updateRoom({
      roomId: room.roomId,
      time: message.timestamp,
      isNew: false,
      currentUserId: user._id,
      recentMessage: {
        sender: message.sender,
        text: message.text,
        unsend: false,
      },
    });

    setText("");
    setShowEmoji(false);
    setUploadError(null);
  }, [text, user, room]);

  const handleFile = useCallback(
    async (file: File) => {
      const type = fileAttachmentType(file);
      await sendMediaFile(file, type);
    },
    [sendMediaFile],
  );

  const handleVoiceStop = useCallback(async () => {
    const result = await voice.stop();
    if (!result) {
      setUploadError("Recording too short. Try again.");
      return;
    }
    await sendMediaFile(result.file, "audio", result.durationSec);
  }, [voice, sendMediaFile]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        className="sr-only"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) void handleFile(picked);
          e.target.value = "";
        }}
      />
      <ChatMessageInput
        value={text}
        onChange={(v) => {
          setText(v);
          if (v.trim()) handleTyping();
        }}
        onSubmit={sendTextMessage}
        onAttach={() => fileInputRef.current?.click()}
        onVoiceStart={() => {
          setShowEmoji(false);
          handleTyping();
          void voice.start();
        }}
        onVoiceStop={() => void handleVoiceStop()}
        onVoiceCancel={voice.cancel}
        isRecording={voice.isRecording}
        recordingDuration={voice.durationSec}
        showEmoji={showEmoji}
        onToggleEmoji={() => setShowEmoji((v) => !v)}
        onEmojiPick={(emoji) => {
          setText((prev) => prev + emoji);
          handleTyping();
        }}
        error={uploadError ?? voice.error}
      />
    </>
  );
}

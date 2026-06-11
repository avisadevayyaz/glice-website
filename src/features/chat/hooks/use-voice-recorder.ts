"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type VoiceRecorderState = {
  isRecording: boolean;
  durationSec: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<{ file: File; durationSec: number } | null>;
  cancel: () => void;
};

function pickMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function useVoiceRecorder(): VoiceRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stopTimer();
    stopStream();
    recorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = 0;
    setDurationSec(0);
    setIsRecording(false);
  }, [stopStream, stopTimer]);

  useEffect(() => () => reset(), [reset]);

  const start = useCallback(async () => {
    setError(null);
    reset();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(250);
      startedAtRef.current = Date.now();
      setIsRecording(true);
      setDurationSec(0);

      timerRef.current = setInterval(() => {
        setDurationSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch {
      reset();
      setError("Microphone access denied or unavailable.");
    }
  }, [reset]);

  const stop = useCallback(async (): Promise<{
    file: File;
    durationSec: number;
  } | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      reset();
      return null;
    }

    const elapsedMs = Date.now() - startedAtRef.current;
    const durationSec = Math.max(1, Math.round(elapsedMs / 1000));
    if (elapsedMs < 600) {
      reset();
      return null;
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        reset();

        if (blob.size < 200) {
          resolve(null);
          return;
        }

        const ext = mimeType.includes("mp4")
          ? "m4a"
          : mimeType.includes("ogg")
            ? "ogg"
            : "webm";
        resolve({
          file: new File([blob], `voice-${Date.now()}.${ext}`, {
            type: mimeType,
          }),
          durationSec,
        });
      };

      try {
        if (recorder.state === "recording") {
          recorder.requestData();
        }
      } catch {
        /* some browsers omit requestData */
      }
      recorder.stop();
    });
  }, [reset]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    reset();
  }, [reset]);

  return {
    isRecording,
    durationSec,
    error,
    start,
    stop,
    cancel,
  };
}

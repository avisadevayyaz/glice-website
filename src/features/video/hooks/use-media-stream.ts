"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export type MediaStatus =
  | "checking"
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "error";

function mediaConstraints(): MediaStreamConstraints {
  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 720px)").matches;

  return {
    video: {
      facingMode: "user",
      width: { ideal: isMobile ? 640 : 1280 },
      height: { ideal: isMobile ? 480 : 720 },
    },
    audio: true,
  };
}

let sharedStream: MediaStream | null = null;

export function getSharedMediaStream(): MediaStream | null {
  return sharedStream;
}

function hasLiveTracks(stream: MediaStream | null) {
  if (!stream?.active) return false;
  return stream.getVideoTracks().some((t) => t.readyState === "live");
}

function bindStream(
  video: HTMLVideoElement | null,
  stream: MediaStream | null,
) {
  if (!video) return;

  if (!stream) {
    if (video.srcObject) video.srcObject = null;
    return;
  }

  if (video.srcObject !== stream) {
    video.srcObject = stream;
  }

  const play = () => {
    if (video.srcObject !== stream) return;
    void video.play().catch(() => {
      /* may need another loadedmetadata retry after permission gate closes */
    });
  };

  play();

  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    video.addEventListener("loadeddata", play, { once: true });
    video.addEventListener("loadedmetadata", play, { once: true });
  }
}

function clearSharedStream() {
  sharedStream?.getTracks().forEach((track) => track.stop());
  sharedStream = null;
}

async function queryPermissionStates(): Promise<{
  camera: PermissionState | "unknown";
  microphone: PermissionState | "unknown";
}> {
  if (!navigator.permissions?.query) {
    return { camera: "unknown", microphone: "unknown" };
  }

  try {
    const [camera, microphone] = await Promise.all([
      navigator.permissions.query({ name: "camera" as PermissionName }),
      navigator.permissions.query({ name: "microphone" as PermissionName }),
    ]);
    return { camera: camera.state, microphone: microphone.state };
  } catch {
    return { camera: "unknown", microphone: "unknown" };
  }
}

async function acquireMediaStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("unsupported");
  }
  return navigator.mediaDevices.getUserMedia(mediaConstraints());
}

async function tryAcquireStream(): Promise<MediaStream | null> {
  try {
    return await acquireMediaStream();
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
    } catch {
      return null;
    }
  }
}

export function useMediaStream() {
  const localRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(sharedStream);
  const [status, setStatus] = useState<MediaStatus>("idle");
  const [cameraEnabled, setCameraEnabledState] = useState(true);
  const probeStartedRef = useRef(false);
  const acquiringRef = useRef(false);

  const syncVideo = useCallback(() => {
    bindStream(localRef.current, streamRef.current);
  }, []);

  /** Callback ref — re-binds stream whenever the <video> node mounts or moves panels. */
  const attachLocalVideo = useCallback((node: HTMLVideoElement | null) => {
    localRef.current = node;
    if (node) {
      node.setAttribute("playsinline", "true");
      node.setAttribute("webkit-playsinline", "true");
    }
    bindStream(node, streamRef.current);
  }, []);

  const applyStream = useCallback(
    (stream: MediaStream) => {
      sharedStream = stream;
      streamRef.current = stream;
      syncVideo();
      setCameraEnabledState(true);
      setStatus("ready");
    },
    [syncVideo],
  );

  const attachSharedStream = useCallback(() => {
    if (!hasLiveTracks(sharedStream)) return false;
    streamRef.current = sharedStream;
    syncVideo();
    setStatus("ready");
    return true;
  }, [syncVideo]);

  const stopStream = useCallback(() => {
    clearSharedStream();
    streamRef.current = null;
    bindStream(localRef.current, null);
    setCameraEnabledState(true);
    setStatus("idle");
  }, []);

  const requestAccess = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      return false;
    }

    if (attachSharedStream()) return true;

    acquiringRef.current = true;
    setStatus("requesting");

    if (sharedStream && !hasLiveTracks(sharedStream)) {
      clearSharedStream();
      streamRef.current = null;
    }

    try {
      let stream = await tryAcquireStream();
      if (!stream) {
        await new Promise((resolve) => window.setTimeout(resolve, 200));
        stream = await tryAcquireStream();
      }

      if (stream) {
        applyStream(stream);
        return true;
      }

      const { camera, microphone } = await queryPermissionStates();

      if (camera === "granted" && microphone === "granted") {
        setStatus("error");
        return false;
      }

      if (camera === "denied" || microphone === "denied") {
        setStatus("denied");
        return false;
      }

      setStatus("idle");
      return false;
    } finally {
      acquiringRef.current = false;
    }
  }, [applyStream, attachSharedStream]);

  const setMuted = useCallback((muted: boolean) => {
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, []);

  const setCameraEnabled = useCallback((enabled: boolean) => {
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setCameraEnabledState(enabled);
  }, []);

  useLayoutEffect(() => {
    if (status !== "ready") return;
    syncVideo();
    const raf = requestAnimationFrame(() => syncVideo());
    const retry = window.setTimeout(() => syncVideo(), 150);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(retry);
    };
  }, [status, syncVideo, cameraEnabled]);

  useEffect(() => {
    if (probeStartedRef.current) return;
    probeStartedRef.current = true;

    if (attachSharedStream()) return;

    let cancelled = false;

    const probeExistingAccess = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) setStatus("error");
        return;
      }

      const { camera, microphone } = await queryPermissionStates();
      if (cancelled) return;

      if (camera === "denied" || microphone === "denied") {
        setStatus("denied");
        return;
      }

      // Only auto-attach when the browser already granted both permissions.
      // Never call getUserMedia on first paint — Chrome/Safari block prompts
      // without a user gesture (common on ngrok and other tunnel URLs).
      if (camera === "granted" && microphone === "granted") {
        const stream = await tryAcquireStream();
        if (cancelled) {
          stream?.getTracks().forEach((track) => track.stop());
          return;
        }
        if (stream) {
          applyStream(stream);
          return;
        }
        if (!cancelled) setStatus("error");
        return;
      }

      if (!cancelled) setStatus("idle");
    };

    void probeExistingAccess();

    return () => {
      cancelled = true;
    };
  }, [applyStream, attachSharedStream]);

  useEffect(() => {
    if (!navigator.permissions?.query) return;

    let disposed = false;
    let cameraPerm: PermissionStatus | null = null;
    let micPerm: PermissionStatus | null = null;

    const onPermissionChange = () => {
      if (
        disposed ||
        acquiringRef.current ||
        status === "ready" ||
        status === "requesting"
      ) {
        return;
      }

      const cameraState = cameraPerm?.state;
      const micState = micPerm?.state;

      if (cameraState === "granted" && micState === "granted") {
        void tryAcquireStream().then((stream) => {
          if (!stream) {
            if (!disposed) setStatus("error");
            return;
          }
          if (!disposed) applyStream(stream);
          else stream.getTracks().forEach((track) => track.stop());
        });
        return;
      }

      if (cameraState === "denied" || micState === "denied") {
        setStatus("denied");
      }
    };

    void Promise.all([
      navigator.permissions.query({ name: "camera" as PermissionName }),
      navigator.permissions.query({ name: "microphone" as PermissionName }),
    ])
      .then(([camera, microphone]) => {
        if (disposed) return;
        cameraPerm = camera;
        micPerm = microphone;
        camera.addEventListener("change", onPermissionChange);
        microphone.addEventListener("change", onPermissionChange);
      })
      .catch(() => {
        /* Permissions API unsupported */
      });

    return () => {
      disposed = true;
      cameraPerm?.removeEventListener("change", onPermissionChange);
      micPerm?.removeEventListener("change", onPermissionChange);
    };
  }, [applyStream, status]);

  return {
    localRef,
    attachLocalVideo,
    status,
    cameraEnabled,
    requestAccess,
    setMuted,
    setCameraEnabled,
    stopStream,
    syncVideo,
  };
}

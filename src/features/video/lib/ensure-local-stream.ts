const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
  audio: true,
};

export async function ensureLocalStream(
  getStream: () => MediaStream | null,
): Promise<MediaStream | null> {
  const existing = getStream();
  if (
    existing?.active &&
    existing.getVideoTracks().some((t) => t.readyState === "live")
  ) {
    return existing;
  }

  if (!navigator.mediaDevices?.getUserMedia) return null;

  try {
    return await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
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

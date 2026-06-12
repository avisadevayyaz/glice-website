"use client";

import { CallChatPanel } from "@/components/video/call-chat-panel";
import { MatchConnectingOverlay } from "@/components/video/match-connecting-overlay";
import { MediaPermissionGate } from "@/components/video/media-permission-gate";
import { NearbySearchMotion } from "@/components/video/match-search-motion";
import { VideoFeedbackPanel } from "@/components/video/video-feedback-panel";
import { useUiSession } from "@/components/site/ui-session-provider";
import { useMediaStream } from "@/features/video/hooks/use-media-stream";
import { useVideoCall } from "@/features/video/hooks/use-video-call";
import { useMounted } from "@/hooks/use-mounted";
import { AnimatePresence, motion } from "framer-motion";
import {
  clampAge,
  clampDistance,
  normalizeAgeRange,
} from "@/features/video/lib/pref-bounds";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthModal } from "./auth-modal";
import { PreferenceModal } from "./preference-modal";

const GENDER_OPTIONS = ["Everyone", "Women", "Men"] as const;

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function partnerInitial(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function remoteBadge(
  stage: string,
  partnerName: string,
  searching: boolean,
) {
  if (searching) return "Searching…";
  if (stage === "connecting") return "Connecting…";
  if (stage === "connected" || stage === "feedback") return partnerName;
  return "Waiting";
}

function bindRemoteStream(
  video: HTMLVideoElement | null,
  stream: MediaStream | null,
) {
  if (!video) return;

  if (stream && stream !== video.srcObject) {
    video.srcObject = stream;
    void video.play().catch(() => {
      /* autoplay */
    });
    return;
  }

  if (!stream && video.srcObject) {
    video.srcObject = null;
  }
}

export function VideoHero() {
  const { isLoggedIn, openAuth, user } = useUiSession();
  const {
    attachLocalVideo,
    status: mediaStatus,
    cameraEnabled,
    requestAccess,
    setMuted,
    setCameraEnabled,
    syncVideo,
  } = useMediaStream();

  const {
    stage: callStage,
    partner,
    messages,
    remoteStream,
    remoteVideoOn,
    isLocalPrimary,
    searchSecondsLeft,
    callSecondsLeft,
    error: callError,
    feedbackPhase,
    mutualMatch,
    toggleLayout,
    startSearch,
    cancelSearch,
    endCall,
    nextPerson,
    submitFeedback,
    sendMessage,
    notifyVideoState,
  } = useVideoCall();

  const remoteRef = useRef<HTMLVideoElement>(null);
  const [gender, setGender] = useState<(typeof GENDER_OPTIONS)[number]>("Everyone");
  const [genderMenuOpen, setGenderMenuOpen] = useState(false);
  const [prefOpen, setPrefOpen] = useState(false);
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(35);
  const [maxDistance, setMaxDistance] = useState(50);

  const setMinAgeBounded = useCallback((value: number) => {
    const next = clampAge(value);
    setMinAge(next);
    setMaxAge((prev) => (next > prev ? next : prev));
  }, []);

  const setMaxAgeBounded = useCallback((value: number) => {
    const next = clampAge(value);
    setMaxAge(next);
    setMinAge((prev) => (next < prev ? next : prev));
  }, []);

  const setMaxDistanceBounded = useCallback((value: number) => {
    setMaxDistance(clampDistance(value));
  }, []);

  useEffect(() => {
    if (!prefOpen) return;
    const ages = normalizeAgeRange(minAge, maxAge);
    const distance = clampDistance(maxDistance);
    if (ages.minAge !== minAge) setMinAge(ages.minAge);
    if (ages.maxAge !== maxAge) setMaxAge(ages.maxAge);
    if (distance !== maxDistance) setMaxDistance(distance);
  }, [prefOpen]); // eslint-disable-line react-hooks/exhaustive-deps -- sanitize once when opening
  const [isMuted, setIsMuted] = useState(false);
  const genderMenuRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();

  const attachRemoteVideo = useCallback(
    (node: HTMLVideoElement | null) => {
      remoteRef.current = node;
      bindRemoteStream(node, remoteStream);
    },
    [remoteStream],
  );

  const mediaReady = mounted && mediaStatus === "ready";
  const mediaBinding =
    mediaStatus === "requesting" || mediaStatus === "ready";
  const needsPermissionOverlay =
    mediaStatus === "idle" ||
    mediaStatus === "denied" ||
    mediaStatus === "error" ||
    mediaStatus === "requesting";
  const showVideoStage = mounted && mediaBinding;
  const isCheckingMedia = !mounted;
  const isBusy = callStage === "searching";
  const isConnecting = callStage === "connecting";
  const inCall = callStage === "connected";
  const isInVideoSession =
    callStage === "searching" ||
    callStage === "connecting" ||
    callStage === "connected" ||
    callStage === "feedback";
  const showChat =
    callStage === "connecting" || callStage === "connected";
  const partnerName = partner?.name ?? "Match";
  const partnerInitialChar = partnerInitial(partnerName);
  const swapped = isLocalPrimary;
  const showRemoteVideo = inCall && remoteStream && remoteVideoOn;
  const showRemotePlaceholder = inCall && !showRemoteVideo;
  const showRemoteCell = inCall || isConnecting;
  const showPartnerInBadge = Boolean(
    partner &&
      (isConnecting || inCall || callStage === "feedback"),
  );

  const [permissionGateOpen, setPermissionGateOpen] = useState(false);
  const [permissionGateExiting, setPermissionGateExiting] = useState(false);

  useEffect(() => {
    if (!mounted || mediaStatus !== "idle") return;

    const timer = window.setTimeout(() => {
      setPermissionGateOpen(true);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [mounted, mediaStatus]);

  useEffect(() => {
    if (!mounted) return;

    if (needsPermissionOverlay) {
      if (mediaStatus !== "idle") {
        setPermissionGateOpen(true);
      }
      setPermissionGateExiting(false);
      return;
    }

    if (mediaStatus !== "ready") return;

    setPermissionGateExiting(true);
    const timer = window.setTimeout(() => {
      setPermissionGateOpen(false);
      setPermissionGateExiting(false);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [mounted, needsPermissionOverlay, mediaStatus]);

  useEffect(() => {
    if (mediaStatus !== "ready" || permissionGateOpen) return;
    syncVideo();
    const raf = requestAnimationFrame(() => syncVideo());
    const retry = window.setTimeout(() => syncVideo(), 120);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(retry);
    };
  }, [mediaStatus, permissionGateOpen, syncVideo]);

  useEffect(() => {
    if (!isLoggedIn) {
      queueMicrotask(() => {
        setGenderMenuOpen(false);
        if (isBusy) cancelSearch();
      });
    }
  }, [isLoggedIn, isBusy, cancelSearch]);

  useEffect(() => {
    if (!showVideoStage) return;
    syncVideo();
    const raf = requestAnimationFrame(() => syncVideo());
    const retry = window.setTimeout(() => syncVideo(), 120);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(retry);
    };
  }, [
    callStage,
    showVideoStage,
    syncVideo,
    cameraEnabled,
    swapped,
    showRemoteCell,
  ]);

  useEffect(() => {
    bindRemoteStream(remoteRef.current, remoteStream);
  }, [remoteStream, callStage, swapped]);

  useEffect(() => {
    document.body.classList.toggle("video-session-active", isInVideoSession);
    return () => {
      document.body.classList.remove("video-session-active");
    };
  }, [isInVideoSession]);

  useEffect(() => {
    if (!genderMenuOpen) return;

    const close = (event: MouseEvent) => {
      if (
        genderMenuRef.current &&
        !genderMenuRef.current.contains(event.target as Node)
      ) {
        setGenderMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [genderMenuOpen]);

  const buildFilter = useCallback(
    () => ({
      gender,
      minAge,
      maxAge,
      maxDistance,
    }),
    [gender, minAge, maxAge, maxDistance],
  );

  const startVideo = async () => {
    if (!isLoggedIn) {
      openAuth("login");
      return;
    }
    if (isBusy) return;

    if (isConnecting) {
      cancelSearch();
    }

    if (!mediaReady) {
      const granted = await requestAccess();
      if (!granted) return;
    }

    syncVideo();
    startSearch(buildFilter());
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setMuted(next);
  };

  const toggleCamera = () => {
    const next = !cameraEnabled;
    setCameraEnabled(next);
    if (inCall) notifyVideoState(next);
  };

  return (
    <>
      <section
        className={`video-hero${isInVideoSession ? " video-hero--session" : ""}`}
        id="videoHero"
      >
        {permissionGateOpen && (
          <MediaPermissionGate
            status={mediaStatus}
            exiting={permissionGateExiting}
            onRequest={requestAccess}
          />
        )}

        <div
          className={`video-hero-inner${permissionGateOpen && !permissionGateExiting ? " video-hero-inner--locked" : ""}`}
          aria-hidden={permissionGateOpen && !permissionGateExiting}
        >
          <div className="hero-dual-shell">
            {callError &&
              (callStage === "idle" || callStage === "connecting") && (
              <p className="hero-call-error" role="alert">
                {callError}
              </p>
            )}

            <div className="hero-dual-wrap">
              <div className="hero-dual">
                <div className="hero-panel hero-panel--remote">
                  <div
                    className={`hero-panel-badge hero-panel-badge--remote${isBusy || isConnecting || inCall || callStage === "feedback" ? " hero-panel-badge--active" : ""}${showPartnerInBadge ? " hero-panel-badge--with-avatar" : ""}`}
                  >
                    {showPartnerInBadge ? (
                      <span className="hero-panel-badge-avatar" aria-hidden>
                        {partner?.profileUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={partner.profileUrl}
                            alt=""
                            className="hero-panel-badge-avatar-img"
                          />
                        ) : (
                          <span className="hero-panel-badge-avatar-fallback">
                            {partnerInitialChar}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="hero-panel-badge-dot" aria-hidden />
                    )}
                    <span className="hero-panel-badge-label">
                      {remoteBadge(
                        callStage,
                        partnerName,
                        callStage === "searching",
                      )}
                    </span>
                    {inCall && (
                      <span className="hero-panel-badge-meta">
                        {formatTimer(callSecondsLeft)}
                      </span>
                    )}
                    {isBusy && searchSecondsLeft > 0 && (
                      <span className="hero-panel-badge-meta">
                        {searchSecondsLeft}s
                      </span>
                    )}
                  </div>

                  {callStage === "idle" && (
                    <div className="hero-panel-idle hero-panel-idle--remote">
                      <div className="hero-panel-idle-icon" aria-hidden>
                        <i className="ri-radar-line" />
                      </div>
                      <p>Your match appears here</p>
                      <span>
                        Press Start to find people within {maxDistance} km
                      </span>
                    </div>
                  )}

                  <AnimatePresence>
                    {isConnecting && (
                      <MatchConnectingOverlay
                        partnerName={partnerName}
                        profileUrl={partner?.profileUrl}
                      />
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {callStage === "searching" && (
                      <motion.div
                        key="searching"
                        className="hero-panel-overlay hero-panel-overlay--search"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <NearbySearchMotion radiusKm={maxDistance} />
                        <button
                          type="button"
                          className="vc-cancel-search"
                          onClick={cancelSearch}
                        >
                          Cancel search
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {inCall && swapped && !cameraEnabled && (
                    <div className="hero-panel-camera-off hero-panel-camera-off--inline">
                      <i className="ri-camera-off-line" aria-hidden />
                    </div>
                  )}

                  {showRemotePlaceholder && !swapped && (
                    <div className="hero-panel-media hero-panel-media--placeholder">
                      <div className="vc-remote-placeholder vc-remote-placeholder--live">
                        <div className="vc-remote-avatar">
                          {partner?.profileUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={partner.profileUrl}
                              alt=""
                              className="vc-remote-avatar-img"
                            />
                          ) : (
                            partnerInitialChar
                          )}
                        </div>
                        <span className="vc-remote-name">{partnerName}</span>
                      </div>
                    </div>
                  )}

                  {inCall && <div className="vc-connected-badge">Live</div>}

                  <AnimatePresence>
                    {callStage === "feedback" && (
                      <VideoFeedbackPanel
                        partnerName={partnerName}
                        profileUrl={partner?.profileUrl}
                        userName={user?.name ?? user?.username ?? "You"}
                        userProfileUrl={user?.profileUrl}
                        phase={feedbackPhase}
                        mutualMatch={mutualMatch}
                        onLike={() => submitFeedback(true)}
                        onPass={() => submitFeedback(false)}
                        onSkip={() => submitFeedback(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>

                <div className="hero-panel hero-panel--local">
                  <div className="hero-panel-badge hero-panel-badge--local">
                    <span>You</span>
                    {!cameraEnabled && (
                      <span className="hero-panel-badge-meta hero-panel-badge-meta--warn">
                        Camera off
                      </span>
                    )}
                    {isMuted && (
                      <span className="hero-panel-badge-meta hero-panel-badge-meta--warn">
                        Muted
                      </span>
                    )}
                  </div>

                  {showRemotePlaceholder && swapped && (
                    <div className="hero-panel-media hero-panel-media--placeholder">
                      <div className="vc-remote-placeholder vc-remote-placeholder--live">
                        <div className="vc-remote-avatar">
                          {partner?.profileUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={partner.profileUrl}
                              alt=""
                              className="vc-remote-avatar-img"
                            />
                          ) : (
                            partnerInitialChar
                          )}
                        </div>
                        <span className="vc-remote-name">{partnerName}</span>
                      </div>
                    </div>
                  )}

                  {!cameraEnabled && !swapped && (
                    <div className="hero-panel-camera-off">
                      <i className="ri-camera-off-line" aria-hidden />
                      <p>Camera is off</p>
                      <span>Others cannot see your video</span>
                    </div>
                  )}

                  {inCall && (
                    <button
                      type="button"
                      className="hero-pip-toggle"
                      onClick={toggleLayout}
                      aria-label="Swap video layout"
                    >
                      <i className="ri-picture-in-picture-2-line" aria-hidden />
                    </button>
                  )}

                </div>
              </div>

              {showVideoStage && (
                <div
                  className={`hero-video-stage${swapped ? " hero-video-stage--swapped" : ""}${!showRemoteCell ? " hero-video-stage--local-only" : ""}`}
                >
                  {showRemoteCell && (
                    <div className="hero-video-cell hero-video-cell--remote">
                      <video
                        ref={attachRemoteVideo}
                        className={`hero-panel-video hero-panel-video--remote${!showRemoteVideo ? " hero-panel-video--hidden" : ""}`}
                        playsInline
                        autoPlay
                        aria-label={`${partnerName} video`}
                      />
                    </div>
                  )}
                  <div className="hero-video-cell hero-video-cell--local">
                    <video
                      ref={attachLocalVideo}
                      className={`hero-panel-video hero-panel-video--local${!cameraEnabled ? " hero-panel-video--hidden" : ""}`}
                      playsInline
                      muted
                      autoPlay
                      aria-label="Your camera"
                    />
                  </div>
                </div>
              )}

              <CallChatPanel
                partnerName={partnerName}
                active={showChat}
                messages={messages}
                layoutSide={swapped ? "left" : "right"}
                onSend={sendMessage}
              />
            </div>

            <div className="hero-toolbar" role="toolbar" aria-label="Video controls">
              {isConnecting ? (
                <p className="hero-toolbar-hint">Setting up your video call…</p>
              ) : inCall ? (
                <>
                  <button
                    type="button"
                    className={`hero-toolbar-btn${isMuted ? " is-active" : ""}`}
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                    aria-pressed={isMuted}
                  >
                    <i
                      className={isMuted ? "ri-mic-off-line" : "ri-mic-line"}
                      aria-hidden
                    />
                  </button>
                  <button
                    type="button"
                    className={`hero-toolbar-btn${!cameraEnabled ? " is-active" : ""}`}
                    onClick={toggleCamera}
                    aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                    aria-pressed={!cameraEnabled}
                  >
                    <i
                      className={
                        cameraEnabled ? "ri-camera-line" : "ri-camera-off-line"
                      }
                      aria-hidden
                    />
                  </button>
                  <button
                    type="button"
                    className="hero-toolbar-btn"
                    onClick={toggleLayout}
                    aria-label="Swap video layout"
                  >
                    <i className="ri-picture-in-picture-2-line" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="hero-toolbar-btn hero-toolbar-btn--next"
                    onClick={() => nextPerson()}
                    aria-label="Next person"
                  >
                    <i className="ri-skip-forward-fill" aria-hidden />
                    <span>Next</span>
                  </button>
                  <button
                    type="button"
                    className="hero-toolbar-btn hero-toolbar-btn--end"
                    onClick={endCall}
                    aria-label="End call"
                  >
                    <i className="ri-phone-fill" aria-hidden />
                  </button>
                </>
              ) : callStage === "feedback" ? (
                <p className="hero-toolbar-hint">
                  {mutualMatch || feedbackPhase === "matched"
                    ? "It's a match!"
                    : "Like or pass to continue"}
                </p>
              ) : (
                <>
                  <div className="hero-toolbar-menu-wrap" ref={genderMenuRef}>
                    <button
                      type="button"
                      className="hero-toolbar-btn"
                      aria-expanded={genderMenuOpen}
                      aria-haspopup="listbox"
                      disabled={isBusy}
                      onClick={() => setGenderMenuOpen((open) => !open)}
                    >
                      <i className="ri-user-line" aria-hidden />
                      <span>{gender}</span>
                      <i className="ri-arrow-down-s-line" aria-hidden />
                    </button>
                    {genderMenuOpen && (
                      <div className="hero-toolbar-menu" role="listbox">
                        {GENDER_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            role="option"
                            aria-selected={gender === option}
                            className={`hero-toolbar-menu-item${gender === option ? " is-active" : ""}`}
                            onClick={() => {
                              setGender(option);
                              setGenderMenuOpen(false);
                            }}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="hero-toolbar-btn"
                    disabled={isBusy}
                    onClick={() => setPrefOpen(true)}
                  >
                    <i className="ri-equalizer-line" aria-hidden />
                    <span>
                      {minAge}–{maxAge} · {maxDistance} km
                    </span>
                  </button>

                  <button
                    type="button"
                    className="hero-toolbar-btn hero-toolbar-btn--start"
                    onClick={startVideo}
                    disabled={isBusy || isCheckingMedia}
                  >
                    <i className="ri-vidicon-fill" aria-hidden />
                    <span>{isBusy ? "Searching…" : "Start"}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <PreferenceModal
        open={prefOpen}
        minAge={minAge}
        maxAge={maxAge}
        maxDistance={maxDistance}
        onClose={() => setPrefOpen(false)}
        onDone={() => setPrefOpen(false)}
        onMinAgeChange={setMinAgeBounded}
        onMaxAgeChange={setMaxAgeBounded}
        onMaxDistanceChange={setMaxDistanceBounded}
      />

      <AuthModal />
    </>
  );
}

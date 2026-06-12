"use client";

import Image from "next/image";
import type { MediaStatus } from "@/features/video/hooks/use-media-stream";

type MediaPermissionGateProps = {
  status: MediaStatus;
  exiting?: boolean;
  onRequest: () => void | Promise<boolean>;
};

export function MediaPermissionGate({
  status,
  exiting = false,
  onRequest,
}: MediaPermissionGateProps) {
  const isRequesting = status === "requesting";
  const isDenied = status === "denied";
  const isDeviceError = status === "error";

  const handleRetry = () => {
    void onRequest();
  };

  return (
    <div
      className={`media-permission-gate${exiting ? " media-permission-gate--exiting" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-gate-title"
    >
      <div className="media-permission-gate-layout">
        <div className="media-permission-gate-visual" aria-hidden>
          <div className="media-permission-gate-visual-grid">
            <div className="media-permission-gate-slot media-permission-gate-slot--match">
              <i className="ri-user-search-line" />
              <span>Match</span>
            </div>
            <div className="media-permission-gate-slot media-permission-gate-slot--you">
              <i className="ri-camera-line" />
              <span>You</span>
            </div>
          </div>
          <div className="media-permission-gate-visual-ring" />
          <div className="media-permission-gate-visual-beam" />
        </div>

        <div className="media-permission-gate-content">
          <div className="media-permission-gate-brand">
            <Image
              src="/icons/transparent_icon.png"
              alt=""
              width={40}
              height={40}
            />
            <span>Glice</span>
          </div>

          <h2 id="media-gate-title" className="media-permission-gate-title">
            Enable camera &amp; mic to go live
          </h2>
          <p className="media-permission-gate-desc">
            Live video with people near you requires both permissions. We only
            use them while you are on a call.
          </p>

          <div className="media-permission-gate-perms">
            <div className="media-permission-gate-perm">
              <div className="media-permission-gate-perm-icon">
                <i className="ri-camera-line" aria-hidden />
              </div>
              <div>
                <strong>Camera</strong>
                <span>Your video feed on the right panel</span>
              </div>
            </div>
            <div className="media-permission-gate-perm">
              <div className="media-permission-gate-perm-icon">
                <i className="ri-mic-line" aria-hidden />
              </div>
              <div>
                <strong>Microphone</strong>
                <span>Voice chat with your match</span>
              </div>
            </div>
          </div>

          {isDenied && (
            <div className="media-permission-gate-error" role="alert">
              <p>Camera or microphone is blocked for this site.</p>
              <ol className="media-permission-gate-steps">
                <li>Click the <strong>lock icon</strong> left of the address bar</li>
                <li>Set <strong>Camera</strong> and <strong>Microphone</strong> to Allow</li>
                <li>Click <strong>Try again</strong> below</li>
              </ol>
            </div>
          )}

          {isDeviceError && (
            <p className="media-permission-gate-error" role="alert">
              Permissions are allowed but your camera or microphone could not
              start. Close other apps using them, then try again.
            </p>
          )}

          <button
            type="button"
            className="media-permission-gate-btn"
            onClick={handleRetry}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <>
                <span className="media-permission-gate-spinner" aria-hidden />
                Connecting camera &amp; microphone…
              </>
            ) : isDenied || isDeviceError ? (
              "Try again"
            ) : (
              <>
                <i className="ri-shield-check-line" aria-hidden />
                Continue — allow access
              </>
            )}
          </button>

          <p className="media-permission-gate-note">
            If you already allowed access in browser settings, click Try again
            and we will reconnect automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

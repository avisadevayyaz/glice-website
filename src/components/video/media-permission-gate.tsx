"use client";

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
          <div className="media-permission-gate-visual-ring" />
          <div className="media-permission-gate-visual-icons">
            <div className="media-permission-gate-icon media-permission-gate-icon--cam">
              <i className="ri-camera-line" />
            </div>
            <div className="media-permission-gate-icon media-permission-gate-icon--mic">
              <i className="ri-mic-line" />
            </div>
          </div>
        </div>

        <div className="media-permission-gate-content">
          <h2 id="media-gate-title" className="media-permission-gate-title">
            Camera &amp; microphone needed
          </h2>
          <p className="media-permission-gate-desc">
            Allow access to start a live video call. We only use your camera
            and mic while you are on a call.
          </p>

          <div className="media-permission-gate-perms">
            <div className="media-permission-gate-perm">
              <div className="media-permission-gate-perm-icon">
                <i className="ri-camera-line" aria-hidden />
              </div>
              <div>
                <strong>Camera</strong>
                <span>Your video on the right panel</span>
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
                <li>
                  Click the <strong>lock icon</strong> left of the address bar
                </li>
                <li>
                  Set <strong>Camera</strong> and <strong>Microphone</strong> to
                  Allow
                </li>
                <li>
                  Click <strong>Try again</strong> below
                </li>
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
                Connecting…
              </>
            ) : isDenied || isDeviceError ? (
              "Try again"
            ) : (
              "Allow camera & microphone"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

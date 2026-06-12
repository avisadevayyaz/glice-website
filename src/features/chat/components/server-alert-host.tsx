"use client";

import { useSocketStore } from "@/features/chat/stores/socket-store";
import { AlertCircle, X } from "lucide-react";

export function ServerAlertHost(): React.ReactElement | null {
  const serverAlert = useSocketStore((s) => s.serverAlert);
  const dismiss = useSocketStore((s) => s.dismissServerAlert);

  if (!serverAlert) return null;

  return (
    <div className="server-alert-backdrop" role="presentation">
      <div
        className="server-alert-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="server-alert-title"
        aria-describedby="server-alert-desc"
      >
        <div className="server-alert-icon" aria-hidden>
          <AlertCircle strokeWidth={2.25} />
        </div>
        <h2 id="server-alert-title" className="server-alert-title">
          Connection problem
        </h2>
        <p id="server-alert-desc" className="server-alert-desc">
          {serverAlert}
        </p>
        <button
          type="button"
          className="server-alert-btn"
          onClick={dismiss}
        >
          OK
        </button>
        <button
          type="button"
          className="server-alert-close"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

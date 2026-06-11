"use client";

type LogoutConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function LogoutConfirmModal({
  open,
  onClose,
  onConfirm,
}: LogoutConfirmModalProps) {
  return (
    <div
      className={`modal-backdrop${open ? " is-open" : ""}`}
      aria-hidden={!open}
      role="dialog"
      aria-labelledby="logoutModalTitle"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="confirm-modal">
        <button
          type="button"
          className="auth-modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          <i className="ri-close-line" />
        </button>

        <div className="confirm-modal-icon" aria-hidden="true">
          <i className="ri-logout-box-r-line" />
        </div>

        <h2 id="logoutModalTitle">Log out?</h2>
        <p className="auth-modal-sub">
          You will need to sign in again to start video chatting and access your
          account.
        </p>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="confirm-modal-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="confirm-modal-confirm"
            onClick={onConfirm}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

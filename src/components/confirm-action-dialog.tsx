"use client";

import { Loader } from "@/components/loader";

export function ConfirmActionDialog({
  title,
  message,
  confirmLabel,
  danger = false,
  loading = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="overlay confirmation-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-action-title">
      <div className="modal confirmation-dialog">
        <div className="modal-head confirmation-dialog-head">
          <h2 id="confirm-action-title">{title}</h2>
        </div>
        <div className="confirmation-dialog-body">
          <p>{message}</p>
          <div className="reason-actions">
            <button type="button" className="secondary" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button type="button" className={danger ? "danger" : "primary"} onClick={onConfirm} disabled={loading}>
              {loading ? <Loader label="Saving" /> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

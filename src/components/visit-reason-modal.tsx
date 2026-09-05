"use client";

import { useEffect, useState } from "react";
import { VisitStatus } from "@prisma/client";
import { Loader } from "@/components/loader";

type ReasonStatus = "REJECTED" | "LEFT_WITHOUT_MEETING";

export function VisitReasonModal({
  status,
  visitId,
  loading = false,
  onCancel,
  onSubmit,
}: {
  status: ReasonStatus;
  visitId: string;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [selectedReason, setSelectedReason] = useState("");
  const [comment, setComment] = useState("");
  const isRejection = status === VisitStatus.REJECTED;

  useEffect(() => {
    setSelectedReason("");
    setComment("");
  }, [status, visitId]);

  const reason = comment.trim() || selectedReason;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Add visit reason">
      <div className="modal reason-dialog">
        <div className="modal-head reason-dialog-head">
          <div>
            <h2>{isRejection ? "Reject visitor" : "Visitor left without meeting"}</h2>
            <p className="small">This note will appear in the visit history.</p>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>
        <div className="reason-dialog-body">
          {!isRejection && (
            <select
              className="reason-select"
              value={selectedReason}
              onChange={(event) => setSelectedReason(event.target.value)}
            >
              <option value="">Select a reason</option>
              <option>Staff unavailable</option>
              <option>Staff delayed</option>
              <option>Visitor decided to leave</option>
              <option>Other</option>
            </select>
          )}
          <label className="reason-field" htmlFor={`visit-reason-${visitId}`}>
            <span>
              {isRejection ? "Comment" : "Additional detail"} <em>(optional)</em>
            </span>
            <textarea
              id={`visit-reason-${visitId}`}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={isRejection ? "Add a short reason for reception" : "Add detail if needed"}
              maxLength={500}
              rows={3}
            />
          </label>
          <div className="reason-actions">
            <button type="button" className="secondary" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className={isRejection ? "danger" : "primary"}
              disabled={loading}
              onClick={() => onSubmit(reason)}
            >
              {loading ? <Loader label="Saving" /> : isRejection ? "Reject" : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

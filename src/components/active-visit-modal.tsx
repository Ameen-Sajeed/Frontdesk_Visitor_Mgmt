"use client";

import { useState } from "react";
import { VisitStatus } from "@prisma/client";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Loader } from "@/components/loader";
import { StatusBadge } from "@/components/status-badge";
import { VisitDetailsModal } from "@/components/visit-details-modal";
import { formatDateTime } from "@/lib/timing";

export type ActiveVisit = {
  id: string;
  purpose: string;
  type: string;
  status: string;
  approvalStatus?: string;
  registeredAt: Date | string;
  approvalAskedAt?: Date | string | null;
  decidedAt?: Date | string | null;
  checkedInAt?: Date | string | null;
  meetingStartedAt?: Date | string | null;
  checkedOutAt?: Date | string | null;
  leftAt?: Date | string | null;
  rejectionReason?: string | null;
  leftReason?: string | null;
  visitor: { fullName: string; phone: string; email?: string | null; company?: string | null; designation?: string | null };
  department: { name: string };
  host: { name: string; designation?: string | null };
  history?: {
    id: string;
    status: string;
    createdAt: Date | string;
    note?: string | null;
    changedBy?: { name: string } | null;
  }[];
};

export function ActiveVisitModal({
  visit,
  onClose,
  onResolved,
}: {
  visit: ActiveVisit;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const waiting = visit.status === VisitStatus.WAITING;

  async function markAsLeft() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/visits/${visit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: VisitStatus.LEFT_WITHOUT_MEETING,
          leftReason: "Closed before a duplicate registration.",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not close the existing visit.");
      onResolved();
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Could not close the existing visit.");
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

  return (
    <div className="overlay active-visit-overlay" role="dialog" aria-modal="true" aria-labelledby="active-visit-title">
      <div className="modal active-visit-dialog">
        <div className="modal-head">
          <div>
            <h2 id="active-visit-title">Visitor already has an active visit</h2>
            <p className="small">A new request cannot be registered until this visit is completed or closed.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="active-visit-body">
          <div className="active-visit-summary">
            <div>
              <strong>{visit.visitor.fullName}</strong>
              <p>{visit.visitor.company || visit.visitor.phone}</p>
            </div>
            <StatusBadge status={visit.status as VisitStatus} />
          </div>
          <dl className="active-visit-details">
            <div><dt>Department</dt><dd>{visit.department.name}</dd></div>
            <div><dt>Meeting with</dt><dd>{visit.host.name}</dd></div>
            <div><dt>Purpose</dt><dd>{visit.purpose}</dd></div>
            <div><dt>Registered</dt><dd>{formatDateTime(visit.registeredAt)}</dd></div>
          </dl>
          {error && <p className="error">{error}</p>}
          <div className="active-visit-actions">
            <VisitDetailsModal visit={visit} />
            {waiting && (
              <button className="danger" type="button" disabled={saving} onClick={() => setConfirming(true)}>
                {saving ? <Loader label="Closing" /> : "Mark existing visit as left"}
              </button>
            )}
            <button className="secondary" type="button" onClick={onClose} disabled={saving}>Close</button>
          </div>
        </div>
      </div>
      {confirming && (
        <ConfirmActionDialog
          title="Close the existing visit?"
          message="This marks the active waiting visit as left without meeting. You can then register a new visit for this visitor."
          confirmLabel="Mark as left"
          danger
          loading={saving}
          onCancel={() => setConfirming(false)}
          onConfirm={markAsLeft}
        />
      )}
    </div>
  );
}

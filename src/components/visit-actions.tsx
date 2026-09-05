"use client";
import { useState } from "react";
import { VisitStatus } from "@prisma/client";

export function VisitActions({
  visitId,
  actions,
}: {
  visitId: string;
  actions: { status: VisitStatus; label: string; kind?: "danger" | "secondary" | "primary" }[];
}) {
  const [loading, setLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<VisitStatus | null>(null);
  const [reason, setReason] = useState("");
  async function update(status: VisitStatus, comment?: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(status === VisitStatus.REJECTED ? { rejectionReason: comment } : {}), ...(status === VisitStatus.LEFT_WITHOUT_MEETING ? { leftReason: comment } : {}) }),
      });
      if (!res.ok) throw new Error();
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="actions">
      {actions.map((action) => (
        <button
          key={action.status}
          className={action.kind ?? "secondary"}
          disabled={loading}
          onClick={() => (action.status === VisitStatus.REJECTED || action.status === VisitStatus.LEFT_WITHOUT_MEETING) ? (setPendingStatus(action.status), setReason("")) : update(action.status)}
        >
          {loading ? "Saving…" : action.label}
        </button>
      ))}
      {pendingStatus && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Add visit reason">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-head"><div><h2>{pendingStatus === VisitStatus.REJECTED ? "Reject visitor" : "Visitor left without meeting"}</h2><p className="small">This reason will be saved in the visit history.</p></div><button className="icon-button" type="button" onClick={() => setPendingStatus(null)}>×</button></div>
            <div className="form" style={{ padding: 20 }}>
              {pendingStatus === VisitStatus.LEFT_WITHOUT_MEETING && <select value={reason} onChange={(event) => setReason(event.target.value)}><option value="">Select a reason</option><option>Staff unavailable</option><option>Staff delayed</option><option>Visitor decided to leave</option><option>Other</option></select>}
              <textarea aria-label="Reason or comment" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={pendingStatus === VisitStatus.REJECTED ? "Rejection comment (optional)" : "Add detail, especially for Other (optional)"} maxLength={500} style={{ minHeight: 90 }} />
              <div className="form-actions"><button type="button" className="secondary" onClick={() => setPendingStatus(null)}>Cancel</button><button type="button" className="primary" disabled={loading} onClick={() => { update(pendingStatus, reason); setPendingStatus(null); }}>{loading ? "Saving…" : "Confirm"}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

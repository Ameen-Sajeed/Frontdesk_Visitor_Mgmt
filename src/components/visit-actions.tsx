"use client";
import { useState } from "react";
import { VisitStatus } from "@prisma/client";
import { VisitReasonModal } from "@/components/visit-reason-modal";
import { Loader } from "@/components/loader";

export function VisitActions({
  visitId,
  actions,
}: {
  visitId: string;
  actions: { status: VisitStatus; label: string; kind?: "danger" | "secondary" | "primary" }[];
}) {
  const [loading, setLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<VisitStatus | null>(null);
  async function update(status: VisitStatus, comment?: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(status === VisitStatus.REJECTED ? { rejectionReason: comment } : {}), ...(status === VisitStatus.LEFT_WITHOUT_MEETING ? { leftReason: comment } : {}) }),
      });
      if (!res.ok) throw new Error();
      // The API emits visit_status_changed, which refreshes connected dashboards.
      // Avoid a second local refresh that can cause a visible remount/flash.
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
          onClick={() => (action.status === VisitStatus.REJECTED || action.status === VisitStatus.LEFT_WITHOUT_MEETING) ? setPendingStatus(action.status) : update(action.status)}
        >
          {loading ? <Loader label="Saving" /> : action.label}
        </button>
      ))}
      {pendingStatus && (
        <VisitReasonModal
          status={pendingStatus as "REJECTED" | "LEFT_WITHOUT_MEETING"}
          visitId={visitId}
          loading={loading}
          onCancel={() => setPendingStatus(null)}
          onSubmit={(reason) => { update(pendingStatus, reason); setPendingStatus(null); }}
        />
      )}
    </div>
  );
}

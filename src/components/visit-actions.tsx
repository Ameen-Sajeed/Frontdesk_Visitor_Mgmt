"use client";

import { useState } from "react";
import { VisitStatus } from "@prisma/client";
import { VisitReasonModal } from "@/components/visit-reason-modal";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Loader } from "@/components/loader";

type VisitAction =
  | "APPROVE"
  | "REJECT"
  | "INSIDE"
  | "CHECKED_OUT"
  | "LEFT_WITHOUT_MEETING";

export function VisitActions({
  visitId,
  actions,
}: {
  visitId: string;
  actions: { action: VisitAction; label: string; kind?: "danger" | "secondary" | "primary" }[];
}) {
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<"REJECT" | "LEFT_WITHOUT_MEETING" | null>(null);
  const [confirmation, setConfirmation] = useState<{ action: VisitAction; comment?: string } | null>(null);
  async function update(action: VisitAction, comment?: string) {
    setLoading(true);
    try {
      const body =
        action === "APPROVE" || action === "REJECT"
          ? { action, ...(action === "REJECT" ? { rejectionReason: comment } : {}) }
          : {
              status: action,
              ...(action === VisitStatus.LEFT_WITHOUT_MEETING ? { leftReason: comment } : {}),
            };
      const res = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="actions">
      {actions.map((action) => (
        <button
          key={action.action}
          className={action.kind ?? "secondary"}
          disabled={loading}
          onClick={() =>
            action.action === "REJECT" || action.action === VisitStatus.LEFT_WITHOUT_MEETING
              ? setPendingAction(action.action)
              : setConfirmation({ action: action.action })
          }
        >
          {loading ? <Loader label="Saving" /> : action.label}
        </button>
      ))}
      {pendingAction && (
        <VisitReasonModal
          action={pendingAction}
          visitId={visitId}
          loading={loading}
          onCancel={() => setPendingAction(null)}
          onSubmit={(reason) => {
            setConfirmation({ action: pendingAction, comment: reason });
            setPendingAction(null);
          }}
        />
      )}
      {confirmation && (
        <ConfirmActionDialog
          title={confirmation.action === "APPROVE" ? "Approve visitor?" : confirmation.action === "REJECT" ? "Decline visitor?" : "Confirm visitor update?"}
          message={
            confirmation.action === "APPROVE"
              ? "The receptionist will be notified that this visitor is approved."
              : "This visitor's status will be updated."
          }
          confirmLabel={confirmation.action === "REJECT" ? "Decline" : "Confirm"}
          danger={confirmation.action === "REJECT" || confirmation.action === VisitStatus.LEFT_WITHOUT_MEETING}
          loading={loading}
          onCancel={() => setConfirmation(null)}
          onConfirm={async () => {
            await update(confirmation.action, confirmation.comment);
            setConfirmation(null);
          }}
        />
      )}
    </div>
  );
}

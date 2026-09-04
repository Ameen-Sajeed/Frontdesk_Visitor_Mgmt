import { VisitStatus } from "@prisma/client";

const labels: Record<VisitStatus, string> = {
  REGISTERED: "Registered",
  WAITING_APPROVAL: "Awaiting approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CHECKED_IN: "Checked in",
  IN_MEETING: "In meeting",
  CHECKED_OUT: "Checked out",
};
const classes: Record<VisitStatus, string> = {
  REGISTERED: "neutral",
  WAITING_APPROVAL: "waiting",
  APPROVED: "approved",
  REJECTED: "rejected",
  CHECKED_IN: "checked",
  IN_MEETING: "checked",
  CHECKED_OUT: "neutral",
};
export function StatusBadge({ status }: { status: VisitStatus }) {
  return <span className={`badge ${classes[status]}`}>{labels[status]}</span>;
}

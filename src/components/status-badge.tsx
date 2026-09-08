import { VisitStatus } from "@prisma/client";

const labels: Record<VisitStatus, string> = {
  WAITING: "Checked-in / Waiting",
  INSIDE: "Inside / In meeting",
  CHECKED_OUT: "Checked out",
  LEFT_WITHOUT_MEETING: "Left without meeting",
};
const classes: Record<VisitStatus, string> = {
  WAITING: "waiting",
  INSIDE: "checked",
  CHECKED_OUT: "neutral",
  LEFT_WITHOUT_MEETING: "rejected",
};
export function StatusBadge({ status }: { status: VisitStatus }) {
  return <span className={`badge ${classes[status]}`}>{labels[status]}</span>;
}

import { priorityLabel } from "@/lib/priority";

export function PriorityBadge({ priority }: { priority: number }) {
  const label = priorityLabel(priority);
  return <span className={`priority-badge priority-${label.toLowerCase()}`}>{label}</span>;
}

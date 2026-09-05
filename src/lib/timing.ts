export function formatDateTime(date?: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatTimeOnly(date?: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatDurationMs(ms: number): string {
  if (ms <= 0 || isNaN(ms)) return "0 mins";
  const totalMinutes = Math.floor(ms / (1000 * 60));
  if (totalMinutes < 1) return "< 1 min";
  if (totalMinutes < 60) return `${totalMinutes} min${totalMinutes === 1 ? "" : "s"}`;
  
  const hours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;
  if (remainingMins === 0) return `${hours} hr${hours === 1 ? "" : "s"}`;
  return `${hours} hr${hours === 1 ? "" : "s"} ${remainingMins} min${remainingMins === 1 ? "" : "s"}`;
}

export function calculateWaitingTime(visit: {
  registeredAt: Date | string;
  checkedInAt?: Date | string | null;
  decidedAt?: Date | string | null;
}): string {
  const start = new Date(visit.registeredAt).getTime();
  if (isNaN(start)) return "—";

  // End of waiting is when checked in, or when decided (if rejected), or current time if still waiting
  const end = visit.checkedInAt
    ? new Date(visit.checkedInAt).getTime()
    : visit.decidedAt
    ? new Date(visit.decidedAt).getTime()
    : Date.now();

  return formatDurationMs(end - start);
}

export function calculateMeetingDuration(visit: {
  meetingStartedAt?: Date | string | null;
  checkedInAt?: Date | string | null;
  checkedOutAt?: Date | string | null;
}): string {
  const start = visit.meetingStartedAt
    ? new Date(visit.meetingStartedAt).getTime()
    : visit.checkedInAt
    ? new Date(visit.checkedInAt).getTime()
    : null;

  if (!start) return "Not started";

  const end = visit.checkedOutAt
    ? new Date(visit.checkedOutAt).getTime()
    : Date.now();

  const durationStr = formatDurationMs(end - start);
  return visit.checkedOutAt ? durationStr : `${durationStr} (ongoing)`;
}

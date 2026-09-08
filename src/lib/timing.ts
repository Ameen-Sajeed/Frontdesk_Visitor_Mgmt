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
  leftAt?: Date | string | null;
}): string {
  const start = new Date(visit.registeredAt).getTime();
  if (isNaN(start)) return "—";

  // Waiting ends when the visitor enters the meeting or their visit is otherwise resolved.
  const end = visit.checkedInAt
    ? new Date(visit.checkedInAt).getTime()
    : visit.decidedAt
    ? new Date(visit.decidedAt).getTime()
    : visit.leftAt
    ? new Date(visit.leftAt).getTime()
    : Date.now();

  return formatDurationMs(end - start);
}

export function calculateMeetingDuration(visit: {
  meetingStartedAt?: Date | string | null;
  checkedInAt?: Date | string | null;
  checkedOutAt?: Date | string | null;
  leftAt?: Date | string | null;
  meetings?: MeetingSegment[];
}): string {
  const breakdown = calculateMeetingBreakdown(visit);
  if (breakdown.length) {
    const totalMs = breakdown.reduce((total, meeting) => total + meeting.durationMs, 0);
    const total = formatDurationMs(totalMs);
    return breakdown.some((meeting) => meeting.ongoing) ? `${total} (ongoing)` : total;
  }
  const start = visit.meetingStartedAt
    ? new Date(visit.meetingStartedAt).getTime()
    : visit.checkedInAt
    ? new Date(visit.checkedInAt).getTime()
    : null;

  if (!start) return "Not started";

  // A visit that ended without a formal checkout is still finished. This also
  // correctly handles legacy records that were marked left after entering a meeting.
  const endedAt = visit.checkedOutAt || visit.leftAt;
  const end = endedAt
    ? new Date(endedAt).getTime()
    : Date.now();

  const durationStr = formatDurationMs(end - start);
  return endedAt ? durationStr : `${durationStr} (ongoing)`;
}

export type MeetingSegment = {
  startedAt: Date | string;
  endedAt?: Date | string | null;
  host: { name: string };
  department: { name: string };
};

export function calculateMeetingBreakdown(visit: { meetings?: MeetingSegment[] }) {
  return (visit.meetings ?? []).flatMap((meeting) => {
    const start = new Date(meeting.startedAt).getTime();
    if (isNaN(start)) return [];
    const endedAt = meeting.endedAt;
    const ongoing = !endedAt;
    const end = ongoing ? Date.now() : new Date(endedAt).getTime();
    if (isNaN(end)) return [];
    const durationMs = Math.max(0, end - start);
    return [{
      hostName: meeting.host.name,
      departmentName: meeting.department.name,
      durationMs,
      duration: formatDurationMs(durationMs),
      ongoing,
    }];
  });
}

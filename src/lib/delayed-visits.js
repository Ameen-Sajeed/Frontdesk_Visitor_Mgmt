const { PrismaClient, VisitStatus } = require("@prisma/client");

const prisma = global.__frontdeskPrisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.__frontdeskPrisma = prisma;

async function notifyDelayedVisits(io) {
  const config = await prisma.appConfig.findUnique({ where: { key: "wait_threshold_minutes" } });
  const thresholdMinutes = Number.parseInt(config?.value || "30", 10);
  if (!Number.isFinite(thresholdMinutes) || thresholdMinutes < 1) return [];

  const now = new Date();
  const thresholdStart = new Date(now.getTime() - thresholdMinutes * 60 * 1000);
  const candidates = await prisma.visit.findMany({
    where: {
      status: { in: [VisitStatus.REGISTERED, VisitStatus.WAITING_APPROVAL, VisitStatus.APPROVED, VisitStatus.CHECKED_IN] },
      meetingStartedAt: null,
      checkedOutAt: null,
      delayedNotifiedAt: null,
      registeredAt: { lte: thresholdStart },
    },
    include: { visitor: true, department: true, host: true, history: { orderBy: { createdAt: "asc" } } },
  });

  const notified = [];
  for (const visit of candidates) {
    // Conditional update makes this idempotent across concurrent checks.
    const claimed = await prisma.visit.updateMany({
      where: { id: visit.id, delayedNotifiedAt: null },
      data: { delayedNotifiedAt: now },
    });
    if (!claimed.count) continue;
    const waitingMinutes = Math.floor((now.getTime() - visit.registeredAt.getTime()) / 60000);
    const payload = {
      visit: { ...visit, delayedNotifiedAt: now },
      thresholdMinutes,
      waitingMinutes,
      message: `Visitor ${visit.visitor.fullName} has been waiting for ${waitingMinutes} minutes. The meeting has not started.`,
    };
    if (io) io.to("reception").emit("visit_delayed_alert", payload);
    notified.push(payload);
  }
  return notified;
}

module.exports = { notifyDelayedVisits };

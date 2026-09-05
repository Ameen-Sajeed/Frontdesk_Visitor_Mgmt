import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { visitInclude } from "@/lib/visits";
import { broadcastVisitStatusChanged } from "@/lib/socket-emitter";

export async function GET() {
  try {
    // Get wait threshold from config (default 30 mins)
    const thresholdConfig = await prisma.appConfig.findUnique({
      where: { key: "wait_threshold_minutes" },
    });
    const thresholdMinutes = parseInt(thresholdConfig?.value || "30", 10);
    const thresholdMs = thresholdMinutes * 60 * 1000;
    const now = new Date();

    // Find visits where visitor is waiting (not in meeting, not checked out, not left)
    const activeWaitingVisits = await prisma.visit.findMany({
      where: {
        status: {
          in: ["REGISTERED", "WAITING_APPROVAL", "APPROVED", "CHECKED_IN"],
        },
        meetingStartedAt: null,
        checkedOutAt: null,
        delayedNotifiedAt: null, // Avoid duplicate notifications
      },
      include: visitInclude,
    });

    const delayedVisits = [];

    for (const visit of activeWaitingVisits) {
      const start = new Date(visit.registeredAt).getTime();
      const waitingMs = now.getTime() - start;

      if (waitingMs >= thresholdMs) {
        // Mark delayedNotifiedAt to prevent repeating notification for same visit
        await prisma.visit.update({
          where: { id: visit.id },
          data: { delayedNotifiedAt: now },
        });

        delayedVisits.push({
          ...visit,
          waitingMinutes: Math.floor(waitingMs / (60 * 1000)),
        });

        // Broadcast real-time threshold alert to reception room via Socket.IO
        const g = global as any;
        if (g.io) {
          g.io.to("reception").emit("visit_delayed_alert", {
            visit,
            thresholdMinutes,
            waitingMinutes: Math.floor(waitingMs / (60 * 1000)),
            message: `Visitor ${visit.visitor.fullName} has been waiting for ${Math.floor(waitingMs / (60 * 1000))} minutes. The meeting has not started.`,
          });
        }
      }
    }

    return NextResponse.json({
      thresholdMinutes,
      checkedCount: activeWaitingVisits.length,
      notifiedCount: delayedVisits.length,
      delayedVisits,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed checking delayed visits." },
      { status: 500 },
    );
  }
}

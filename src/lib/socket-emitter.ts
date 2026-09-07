import { Role, UserAccountStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

async function getVisitOwnerUserId(visitData: {
  departmentId?: string;
  host?: { email?: string | null };
}) {
  if (!visitData.departmentId || !visitData.host?.email) return null;
  const user = await prisma.user.findFirst({
    where: {
      email: visitData.host.email,
      departmentId: visitData.departmentId,
      role: Role.DEPARTMENT_LEAD,
      accountStatus: UserAccountStatus.ACTIVE,
    },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function broadcastVisitCreated(visitData: any) {
  const g = global as any;
  const ownerUserId = await getVisitOwnerUserId(visitData);
  if (g.io && ownerUserId) g.io.to(`user_${ownerUserId}`).emit("new_visitor_registered", visitData);
  if (g.io) g.io.to("reception").emit("visit_created", visitData);
}

export async function broadcastVisitorReminder(visitData: any) {
  const g = global as any;
  const ownerUserId = await getVisitOwnerUserId(visitData);
  if (g.io && ownerUserId) {
    g.io
      .to(`user_${ownerUserId}`)
      .emit("new_visitor_registered", { ...visitData, isReminder: true });
  }
}

export async function broadcastVisitStatusChanged(visitData: any) {
  const g = global as any;
  const ownerUserId = await getVisitOwnerUserId(visitData);
  if (g.io) g.io.to("reception").emit("visit_status_changed", visitData);
  if (g.io && ownerUserId) g.io.to(`user_${ownerUserId}`).emit("visit_status_changed", visitData);
}

export function broadcastVisitForwardRequested(forwardRequest: any) {
  const g = global as any;
  if (g.io) g.io.to("reception").emit("visit_forward_requested", forwardRequest);
}

export function broadcastUserAvailabilityChanged(user: {
  id: string;
  departmentId?: string | null;
  availabilityStatus: string;
  customStatus?: string | null;
  customStatusEmoji?: string | null;
}) {
  const g = global as any;
  if (!g.io) return;
  g.io.to("reception").emit("user_availability_changed", {
    userId: user.id,
    departmentId: user.departmentId,
    availabilityStatus: user.availabilityStatus,
    customStatus: user.customStatus,
    customStatusEmoji: user.customStatusEmoji,
  });
}

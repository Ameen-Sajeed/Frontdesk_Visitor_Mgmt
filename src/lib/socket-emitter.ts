export function broadcastVisitCreated(visitData: any) {
  const g = global as any;
  if (g.io) {
    if (visitData?.departmentId) {
      g.io.to(`department_${visitData.departmentId}`).emit("new_visitor_registered", visitData);
    }
    g.io.to("reception").emit("visit_created", visitData);
  }
}

export function broadcastVisitStatusChanged(visitData: any) {
  const g = global as any;
  if (g.io) {
    g.io.to("reception").emit("visit_status_changed", visitData);
    if (visitData?.departmentId) {
      g.io.to(`department_${visitData.departmentId}`).emit("visit_status_changed", visitData);
    }
  }
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
  const payload = {
    userId: user.id,
    departmentId: user.departmentId,
    availabilityStatus: user.availabilityStatus,
    customStatus: user.customStatus,
    customStatusEmoji: user.customStatusEmoji,
  };
  g.io.to("reception").emit("user_availability_changed", payload);
  if (user.departmentId) g.io.to(`department_${user.departmentId}`).emit("user_availability_changed", payload);
}

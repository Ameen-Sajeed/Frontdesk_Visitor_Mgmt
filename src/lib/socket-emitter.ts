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

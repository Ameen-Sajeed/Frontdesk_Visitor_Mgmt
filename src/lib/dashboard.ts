import { Prisma, VisitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getVisitDashboardData(where: Prisma.VisitWhereInput = {}) {
  const visits = await prisma.visit.findMany({
    where,
    select: { status: true, registeredAt: true },
  });
  const statusData = Object.values(VisitStatus).map((status) => ({
    label: status.replaceAll("_", " "),
    value: visits.filter((visit) => visit.status === status).length,
  }));
  const now = new Date();
  const dailyData = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (6 - index));
    const key = day.toISOString().slice(0, 10);
    return {
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
      value: visits.filter((visit) => visit.registeredAt.toISOString().slice(0, 10) === key).length,
    };
  });
  return { statusData, dailyData };
}

export async function getDepartmentResponseMetrics(departmentId?: string) {
  const departments = await prisma.department.findMany({
    where: departmentId ? { id: departmentId } : undefined,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const decisions = await prisma.visit.findMany({
    where: {
      ...(departmentId ? { departmentId } : {}),
      approvalAskedAt: { not: null },
      decidedAt: { not: null },
    },
    select: { departmentId: true, approvalAskedAt: true, decidedAt: true, approvalStatus: true },
  });
  return departments.map((department) => {
    const departmentDecisions = decisions.filter((visit) => visit.departmentId === department.id);
    const totalMinutes = departmentDecisions.reduce(
      (total, visit) =>
        total + (visit.decidedAt!.getTime() - visit.approvalAskedAt!.getTime()) / 60000,
      0,
    );
    return {
      label: department.name,
      averageMinutes: departmentDecisions.length
        ? Math.round(totalMinutes / departmentDecisions.length)
        : 0,
      decisions: departmentDecisions.length,
      rejected: departmentDecisions.filter((visit) => visit.approvalStatus === "REJECTED").length,
    };
  });
}

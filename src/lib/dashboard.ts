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

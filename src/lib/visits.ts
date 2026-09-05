import { VisitStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePhoneForLookup } from "@/lib/phone";
import { visitorRegistrationSchema, type VisitorRegistration } from "@/lib/validation";

export const visitInclude = {
  visitor: true,
  department: true,
  host: true,
  history: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.VisitInclude;

export type VisitWithDetails = Prisma.VisitGetPayload<{ include: typeof visitInclude }>;

function buildDateWhereClause(dateRange?: string): Prisma.DateTimeFilter | undefined {
  if (!dateRange || dateRange === "ALL") return undefined;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dateRange === "TODAY") {
    return { gte: startOfDay };
  }
  if (dateRange === "YESTERDAY") {
    const yesterdayStart = new Date(startOfDay);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    return { gte: yesterdayStart, lt: startOfDay };
  }
  if (dateRange === "7DAYS") {
    const sevenDaysAgo = new Date(startOfDay);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    return { gte: sevenDaysAgo };
  }
  if (dateRange === "30DAYS") {
    const thirtyDaysAgo = new Date(startOfDay);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    return { gte: thirtyDaysAgo };
  }
  return undefined;
}

export async function getPaginatedReceptionVisits({
  status,
  dateRange,
  page = 1,
  limit = 10,
}: {
  status?: string;
  dateRange?: string;
  page?: number;
  limit?: number;
}) {
  const where: Prisma.VisitWhereInput = {};

  if (status && status !== "ALL") {
    where.status = status as VisitStatus;
  }

  const dateFilter = buildDateWhereClause(dateRange);
  if (dateFilter) {
    where.registeredAt = dateFilter;
  }

  const [totalCount, visits] = await Promise.all([
    prisma.visit.count({ where }),
    prisma.visit.findMany({
      where,
      include: visitInclude,
      orderBy: { registeredAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    visits,
    totalCount,
    page,
    totalPages,
    limit,
  };
}

export async function getPaginatedDepartmentVisits({
  departmentId,
  search,
  status,
  dateRange,
  tab = "pending",
  page = 1,
  limit = 10,
}: {
  departmentId: string;
  search?: string;
  status?: string;
  dateRange?: string;
  tab?: "pending" | "history" | string;
  page?: number;
  limit?: number;
}) {
  const where: Prisma.VisitWhereInput = { departmentId };

  if (tab === "pending") {
    where.status = VisitStatus.WAITING_APPROVAL;
  } else if (tab === "history") {
    if (status && status !== "ALL") {
      where.status = status as VisitStatus;
    }

    const dateFilter = buildDateWhereClause(dateRange);
    if (dateFilter) {
      where.registeredAt = dateFilter;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.visitor = {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
          { designation: { contains: q, mode: "insensitive" } },
        ],
      };
    }
  }

  const [totalCount, visits] = await Promise.all([
    prisma.visit.count({ where }),
    prisma.visit.findMany({
      where,
      include: visitInclude,
      orderBy: [{ priority: "desc" }, { registeredAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    visits,
    totalCount,
    page,
    totalPages,
    limit,
  };
}

export async function getDepartmentsWithHosts() {
  return prisma.department.findMany({
    include: { employees: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
}

export async function createVisit(input: VisitorRegistration) {
  const data = visitorRegistrationSchema.parse(input);
  const host = await prisma.employee.findFirst({
    where: { id: data.hostId, departmentId: data.departmentId },
  });
  if (!host) throw new Error("The selected host does not belong to that department.");

  return prisma.$transaction(async (tx) => {
    const visitor = await tx.visitor.create({
      data: {
        fullName: data.fullName,
        phone: data.phone,
        phoneLookupKey: normalizePhoneForLookup(data.phone),
        email: data.email || null,
        company: data.company || null,
        designation: data.designation || null,
      },
    });
    const visit = await tx.visit.create({
      data: {
        visitorId: visitor.id,
        departmentId: data.departmentId,
        hostId: data.hostId,
        purpose: data.purpose,
        type: data.type,
        status: VisitStatus.WAITING_APPROVAL,
        approvalAskedAt: new Date(),
      },
    });
    await tx.visitStatusHistory.createMany({
      data: [
        { visitId: visit.id, status: VisitStatus.REGISTERED, note: "Visitor registered" },
        { visitId: visit.id, status: VisitStatus.WAITING_APPROVAL, note: "Approval requested" },
      ],
    });
    return visit;
  });
}

const transitions: Partial<Record<VisitStatus, VisitStatus[]>> = {
  WAITING_APPROVAL: [VisitStatus.APPROVED, VisitStatus.REJECTED],
  APPROVED: [VisitStatus.CHECKED_IN],
  CHECKED_IN: [VisitStatus.IN_MEETING, VisitStatus.CHECKED_OUT],
  IN_MEETING: [VisitStatus.CHECKED_OUT],
};

export async function changeVisitStatus(id: string, status: VisitStatus) {
  const current = await prisma.visit.findUniqueOrThrow({ where: { id } });
  if (!transitions[current.status]?.includes(status))
    throw new Error(
      `Cannot move a ${current.status.toLowerCase()} visit to ${status.toLowerCase()}.`,
    );
  const now = new Date();
  const timestamps: Prisma.VisitUpdateInput =
    status === VisitStatus.APPROVED || status === VisitStatus.REJECTED
      ? { decidedAt: now }
      : status === VisitStatus.CHECKED_IN
        ? { checkedInAt: now }
        : status === VisitStatus.IN_MEETING
          ? { meetingStartedAt: now }
          : status === VisitStatus.CHECKED_OUT
            ? { checkedOutAt: now }
            : {};
  return prisma.$transaction(async (tx) => {
    const visit = await tx.visit.update({ where: { id }, data: { status, ...timestamps } });
    await tx.visitStatusHistory.create({ data: { visitId: id, status } });
    return visit;
  });
}

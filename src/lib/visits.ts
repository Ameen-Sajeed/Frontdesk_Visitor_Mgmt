import { ApprovalStatus, VisitStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePhoneForLookup } from "@/lib/phone";
import { visitorRegistrationSchema, type VisitorRegistration } from "@/lib/validation";

export const visitInclude = {
  visitor: true,
  department: true,
  host: true,
  history: { orderBy: { createdAt: "asc" }, include: { changedBy: { select: { name: true } } } },
  meetings: {
    orderBy: { startedAt: "asc" },
    include: { host: true, department: true },
  },
} satisfies Prisma.VisitInclude;

export type VisitWithDetails = Prisma.VisitGetPayload<{ include: typeof visitInclude }>;

export class ActiveVisitConflictError extends Error {
  constructor(public activeVisit: VisitWithDetails) {
    super("This visitor already has an active visit.");
    this.name = "ActiveVisitConflictError";
  }
}

export async function getWaitingQueuePositions(visitIds: string[]) {
  if (!visitIds.length) return new Map<string, number>();
  const departmentIds = await prisma.visit.findMany({
    where: { id: { in: visitIds } },
    select: { departmentId: true },
    distinct: ["departmentId"],
  });
  const waitingVisits = await prisma.visit.findMany({
    where: {
      departmentId: { in: departmentIds.map((visit) => visit.departmentId) },
      status: VisitStatus.WAITING,
    },
    select: { id: true, departmentId: true },
    orderBy: [{ departmentId: "asc" }, { priority: "desc" }, { registeredAt: "asc" }],
  });
  const positions = new Map<string, number>();
  const counters = new Map<string, number>();
  for (const visit of waitingVisits) {
    const position = (counters.get(visit.departmentId) ?? 0) + 1;
    counters.set(visit.departmentId, position);
    positions.set(visit.id, position);
  }
  return positions;
}

export function buildDateWhereClause(
  dateRange?: string,
  startDate?: string,
  endDate?: string,
): Prisma.DateTimeFilter | undefined {
  if (dateRange === "CUSTOM" && (startDate || endDate)) {
    const filter: Prisma.DateTimeFilter = {};
    if (startDate) filter.gte = new Date(`${startDate}T00:00:00`);
    if (endDate) filter.lte = new Date(`${endDate}T23:59:59.999`);
    return filter;
  }
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
  search,
  dateRange,
  startDate,
  endDate,
  page = 1,
  limit = 10,
}: {
  status?: string;
  search?: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const where: Prisma.VisitWhereInput = {};

  if (status && status !== "ALL") {
    where.status = status as VisitStatus;
  }

  const dateFilter = buildDateWhereClause(dateRange, startDate, endDate);
  if (dateFilter) {
    where.registeredAt = dateFilter;
  }
  if (search?.trim()) {
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
  hostId,
  search,
  status,
  dateRange,
  startDate,
  endDate,
  tab = "pending",
  page = 1,
  limit = 10,
}: {
  departmentId: string;
  hostId: string;
  search?: string;
  status?: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  tab?: "pending" | "history" | string;
  page?: number;
  limit?: number;
}) {
  const where: Prisma.VisitWhereInput = { departmentId, hostId };

  if (tab === "pending") {
    where.status = VisitStatus.WAITING;
    where.approvalStatus = ApprovalStatus.PENDING;
  } else if (status && status !== "ALL") {
    where.status = status as VisitStatus;
  }

  const dateFilter = buildDateWhereClause(dateRange, startDate, endDate);
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
  const [totalCount, visits] = await Promise.all([
    prisma.visit.count({ where }),
    prisma.visit.findMany({
      where,
      include: visitInclude,
      orderBy: [{ priority: "desc" }, { registeredAt: "asc" }],
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
  const departments = await prisma.department.findMany({
    include: {
      employees: { orderBy: { name: "asc" } },
      users: {
        select: {
          id: true,
          email: true,
          availabilityStatus: true,
          customStatus: true,
          customStatusEmoji: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
  return departments.map(({ users, employees, ...department }) => ({
    ...department,
    employees: employees.map((employee) => {
      const user = users.find((item) => item.email === employee.email);
      return {
        ...employee,
        userId: user?.id ?? null,
        availabilityStatus: user?.availabilityStatus ?? "ACTIVE",
        customStatus: user?.customStatus ?? null,
        customStatusEmoji: user?.customStatusEmoji ?? null,
      };
    }),
  }));
}

export async function createVisit(input: VisitorRegistration, changedByUserId: string) {
  const data = visitorRegistrationSchema.parse(input);
  const host = await prisma.employee.findFirst({
    where: { id: data.hostId, departmentId: data.departmentId },
  });
  if (!host) throw new Error("The selected host does not belong to that department.");

  return prisma.$transaction(async (tx) => {
    const lookupKey = normalizePhoneForLookup(data.phone);

    // Reuse existing visitor if matching phone or lookupKey exists
    let visitor = await tx.visitor.findUnique({ where: { phoneLookupKey: lookupKey } });

    if (visitor) {
      visitor = await tx.visitor.update({
        where: { id: visitor.id },
        data: {
          fullName: data.fullName,
          email: data.email || visitor.email,
          company: data.company || visitor.company,
          designation: data.designation || visitor.designation,
        },
      });
    } else {
      visitor = await tx.visitor.create({
        data: {
          fullName: data.fullName,
          phone: data.phone,
          phoneLookupKey: lookupKey,
          email: data.email || null,
          company: data.company || null,
          designation: data.designation || null,
        },
      });
    }

    const activeVisit = await tx.visit.findFirst({
      where: {
        visitorId: visitor.id,
        status: { in: [VisitStatus.WAITING, VisitStatus.INSIDE] },
      },
      include: visitInclude,
      orderBy: { registeredAt: "asc" },
    });
    if (activeVisit) throw new ActiveVisitConflictError(activeVisit);

    const visit = await tx.visit.create({
      data: {
        visitorId: visitor.id,
        departmentId: data.departmentId,
        hostId: data.hostId,
        purpose: data.purpose,
        type: data.type,
        status: VisitStatus.WAITING,
        approvalStatus: ApprovalStatus.PENDING,
        approvalAskedAt: new Date(),
        priority: data.priority,
      },
    });
    await tx.visitStatusHistory.createMany({
      data: [
        {
          visitId: visit.id,
          status: VisitStatus.WAITING,
          changedByUserId,
          note: "Visitor logged and waiting for approval",
        },
      ],
    });
    return visit;
  });
}

const transitions: Partial<Record<VisitStatus, VisitStatus[]>> = {
  WAITING: [VisitStatus.INSIDE, VisitStatus.LEFT_WITHOUT_MEETING],
  INSIDE: [VisitStatus.CHECKED_OUT],
};

export async function changeVisitStatus(
  id: string,
  status: VisitStatus,
  changedByUserId: string,
  extraData?: { rejectionReason?: string; leftReason?: string },
) {
  const current = await prisma.visit.findUniqueOrThrow({ where: { id } });
  if (!transitions[current.status]?.includes(status))
    throw new Error(
      `Cannot move a ${current.status.toLowerCase()} visit to ${status.toLowerCase()}.`,
    );

  const now = new Date();
  const timestamps: Prisma.VisitUpdateInput =
    status === VisitStatus.INSIDE
      ? { checkedInAt: now, meetingStartedAt: now }
      : status === VisitStatus.CHECKED_OUT
        ? { checkedOutAt: now }
        : status === VisitStatus.LEFT_WITHOUT_MEETING
          ? { leftAt: now, leftReason: extraData?.leftReason || "Visitor left without meeting" }
          : {};

  return prisma.$transaction(async (tx) => {
    if (status === VisitStatus.INSIDE) {
      await tx.visitMeeting.create({
        data: {
          visitId: id,
          departmentId: current.departmentId,
          hostId: current.hostId,
          startedAt: now,
        },
      });
    }
    if (status === VisitStatus.CHECKED_OUT || status === VisitStatus.LEFT_WITHOUT_MEETING) {
      const activeMeeting = await tx.visitMeeting.findFirst({
        where: { visitId: id, endedAt: null },
        orderBy: { startedAt: "desc" },
      });
      if (activeMeeting) {
        await tx.visitMeeting.update({
          where: { id: activeMeeting.id },
          data: { endedAt: now, endedReason: status },
        });
      } else if (current.meetingStartedAt) {
        // Supports records created before individual meeting tracking was introduced.
        await tx.visitMeeting.create({
          data: {
            visitId: id,
            departmentId: current.departmentId,
            hostId: current.hostId,
            startedAt: current.meetingStartedAt,
            endedAt: now,
            endedReason: status,
          },
        });
      }
    }
    const visit = await tx.visit.update({ where: { id }, data: { status, ...timestamps } });

    const note =
      status === VisitStatus.LEFT_WITHOUT_MEETING && extraData?.leftReason
        ? `Left without meeting: ${extraData.leftReason}`
        : `Status changed to ${status.replaceAll("_", " ")}`;

    await tx.visitStatusHistory.create({ data: { visitId: id, status, note, changedByUserId } });
    return visit;
  });
}

export async function decideVisit(
  id: string,
  approvalStatus: "APPROVED" | "REJECTED",
  changedByUserId: string,
  rejectionReason?: string,
) {
  const current = await prisma.visit.findUniqueOrThrow({ where: { id } });
  if (current.status !== VisitStatus.WAITING || current.approvalStatus !== ApprovalStatus.PENDING) {
    throw new Error("This visitor has already been handled.");
  }
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const visit = await tx.visit.update({
      where: { id },
      data:
        approvalStatus === ApprovalStatus.REJECTED
          ? {
              approvalStatus,
              status: VisitStatus.LEFT_WITHOUT_MEETING,
              decidedAt: now,
              leftAt: now,
              rejectionReason: rejectionReason || null,
              leftReason: rejectionReason || "Department unavailable",
            }
          : { approvalStatus, decidedAt: now },
    });
    await tx.visitStatusHistory.create({
      data: {
        visitId: id,
        status: visit.status,
        changedByUserId,
        note:
          approvalStatus === ApprovalStatus.APPROVED
            ? "Department approved visitor"
            : `Department declined visitor${rejectionReason ? `: ${rejectionReason}` : ""}`,
      },
    });
    return visit;
  });
}

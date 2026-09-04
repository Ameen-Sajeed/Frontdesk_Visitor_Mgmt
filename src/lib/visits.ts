import { VisitStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { visitorRegistrationSchema, type VisitorRegistration } from "@/lib/validation";

export const visitInclude = { visitor: true, department: true, host: true } satisfies Prisma.VisitInclude;
export type VisitWithDetails = Prisma.VisitGetPayload<{ include: typeof visitInclude }>;

export async function getDashboardVisits(status?: string) {
  return prisma.visit.findMany({ where: status && status !== "ALL" ? { status: status as VisitStatus } : {}, include: visitInclude, orderBy: { registeredAt: "desc" } });
}

export async function getDepartmentsWithHosts() {
  return prisma.department.findMany({ include: { employees: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } });
}

export async function createVisit(input: VisitorRegistration) {
  const data = visitorRegistrationSchema.parse(input);
  const host = await prisma.employee.findFirst({ where: { id: data.hostId, departmentId: data.departmentId } });
  if (!host) throw new Error("The selected host does not belong to that department.");
  return prisma.$transaction(async (tx) => {
    const visitor = await tx.visitor.create({ data: { fullName: data.fullName, phone: data.phone, email: data.email || null, company: data.company || null } });
    const visit = await tx.visit.create({ data: { visitorId: visitor.id, departmentId: data.departmentId, hostId: data.hostId, purpose: data.purpose, type: data.type, status: VisitStatus.WAITING_APPROVAL, approvalAskedAt: new Date() } });
    await tx.visitStatusHistory.createMany({ data: [{ visitId: visit.id, status: VisitStatus.REGISTERED, note: "Visitor registered" }, { visitId: visit.id, status: VisitStatus.WAITING_APPROVAL, note: "Approval requested" }] });
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
  if (!transitions[current.status]?.includes(status)) throw new Error(`Cannot move a ${current.status.toLowerCase()} visit to ${status.toLowerCase()}.`);
  const now = new Date();
  const timestamps: Prisma.VisitUpdateInput = status === VisitStatus.APPROVED || status === VisitStatus.REJECTED ? { decidedAt: now } : status === VisitStatus.CHECKED_IN ? { checkedInAt: now } : status === VisitStatus.IN_MEETING ? { meetingStartedAt: now } : status === VisitStatus.CHECKED_OUT ? { checkedOutAt: now } : {};
  return prisma.$transaction(async (tx) => {
    const visit = await tx.visit.update({ where: { id }, data: { status, ...timestamps } });
    await tx.visitStatusHistory.create({ data: { visitId: id, status } });
    return visit;
  });
}

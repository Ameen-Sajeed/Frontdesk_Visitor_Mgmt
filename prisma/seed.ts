import { PrismaClient, VisitStatus, VisitType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const names = ["HR", "Marketing", "E-commerce", "Accounts"];
  const departments = await Promise.all(names.map((name) => prisma.department.upsert({ where: { name }, update: {}, create: { name } })));
  const [hr, marketing, ecommerce, accounts] = departments;
  const employees = [
    ["Aisha Rahman", "aisha@company.test", hr.id],
    ["Omar Khalid", "omar@company.test", marketing.id],
    ["Sara Ali", "sara@company.test", ecommerce.id],
    ["Daniel Joseph", "daniel@company.test", accounts.id],
  ];
  for (const [name, email, departmentId] of employees) await prisma.employee.upsert({ where: { email }, update: {}, create: { name, email, departmentId } });
  if (await prisma.visit.count()) return;
  const host = await prisma.employee.findUniqueOrThrow({ where: { email: "aisha@company.test" } });
  const visitor = await prisma.visitor.create({ data: { fullName: "Layla Hassan", phone: "+971 50 123 4567", email: "layla@example.com", company: "Northstar Labs" } });
  const visit = await prisma.visit.create({ data: { visitorId: visitor.id, departmentId: hr.id, hostId: host.id, purpose: "Interview", type: VisitType.APPOINTMENT, status: VisitStatus.WAITING_APPROVAL, approvalAskedAt: new Date() } });
  await prisma.visitStatusHistory.createMany({ data: [{ visitId: visit.id, status: VisitStatus.REGISTERED }, { visitId: visit.id, status: VisitStatus.WAITING_APPROVAL, note: "Awaiting department approval" }] });
}

main().finally(() => prisma.$disconnect());

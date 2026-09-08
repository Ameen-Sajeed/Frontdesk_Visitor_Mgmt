import { PrismaClient, Role, VisitStatus, VisitType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { normalizePhoneForLookup } from "../src/lib/phone";

const prisma = new PrismaClient();

async function main() {
  const defaultPasswordHash = await bcrypt.hash("password123", 10);

  const names = ["HR", "Marketing", "E-commerce", "Accounts"];
  const departments = await Promise.all(
    names.map((name) =>
      prisma.department.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
  const [hr, marketing, ecommerce, accounts] = departments;
  const employees = [
    ["EMP001", "Aisha Rahman", "aisha@company.test", hr.id, "HR Manager"],
    ["EMP002", "Omar Khalid", "omar@company.test", marketing.id, "Marketing Lead"],
    ["EMP003", "Sara Ali", "sara@company.test", ecommerce.id, "E-commerce Specialist"],
    ["EMP004", "Daniel Joseph", "daniel@company.test", accounts.id, "Senior Accountant"],
  ];
  for (const [employeeId, name, email, departmentId, designation] of employees) {
    await prisma.employee.upsert({
      where: { email },
      update: { designation },
      create: { name, email, departmentId, designation },
    });

    await prisma.user.upsert({
      where: { email },
      update: { designation, accountStatus: "ACTIVE" },
      create: {
        employeeId,
        name,
        email,
        password: defaultPasswordHash,
        role: Role.DEPARTMENT_LEAD,
        designation,
        departmentId,
        accountStatus: "ACTIVE",
      },
    });
  }

  // Seed default receptionist user
  await prisma.user.upsert({
    where: { email: "reception@company.test" },
    update: { designation: "Receptionist" },
    create: {
      employeeId: "EMP005",
      name: "Reception Desk",
      email: "reception@company.test",
      password: defaultPasswordHash,
      role: Role.RECEPTIONIST,
      designation: "Receptionist",
      accountStatus: "ACTIVE",
    },
  });
  await prisma.user.upsert({
    where: { email: "admin@company.test" },
    update: { accountStatus: "ACTIVE", role: Role.ADMIN },
    create: {
      employeeId: "EMP006",
      name: "arriVo Admin",
      email: "admin@company.test",
      password: defaultPasswordHash,
      role: Role.ADMIN,
      designation: "Administrator",
      accountStatus: "ACTIVE",
    },
  });
  const employeeIds = await prisma.user.findMany({ select: { employeeId: true } });
  const highestEmployeeNumber = Math.max(
    1,
    ...employeeIds.map((user) => Number(user.employeeId.replace(/^EMP/, "")) || 0),
  );
  await prisma.$executeRaw`
    SELECT setval('"User_employeeId_seq"', ${highestEmployeeNumber}, true)
  `;
  if (await prisma.visit.count()) return;
  const host = await prisma.employee.findUniqueOrThrow({ where: { email: "aisha@company.test" } });
  const phone = "+971 50 123 4567";
  const visitor = await prisma.visitor.create({
    data: {
      fullName: "Layla Hassan",
      phone,
      phoneLookupKey: normalizePhoneForLookup(phone),
      email: "layla@example.com",
      company: "Northstar Labs",
    },
  });
  const visit = await prisma.visit.create({
    data: {
      visitorId: visitor.id,
      departmentId: hr.id,
      hostId: host.id,
      purpose: "Interview",
      type: VisitType.APPOINTMENT,
      status: VisitStatus.WAITING,
      approvalAskedAt: new Date(),
    },
  });
  await prisma.visitStatusHistory.createMany({
    data: [
      { visitId: visit.id, status: VisitStatus.WAITING },
      {
        visitId: visit.id,
        status: VisitStatus.WAITING,
        note: "Awaiting department approval",
      },
    ],
  });
}

main().finally(() => prisma.$disconnect());

import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminUserCreateSchema } from "@/lib/validation";

async function requireAdmin() {
  const session = await getAuthSession();
  return session?.role === "ADMIN" ? session : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const users = await prisma.user.findMany({
    include: { department: { select: { name: true } } },
    orderBy: [{ accountStatus: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(
    users.map(({ password, department, ...user }) => ({
      ...user,
      departmentName: department?.name ?? null,
    })),
  );
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { userId, accountStatus, role, departmentId } = await request.json();
  if (!userId || !["PENDING", "ACTIVE", "BLOCKED"].includes(accountStatus))
    return NextResponse.json({ error: "Invalid user update." }, { status: 400 });
  if (role && !Object.values(Role).includes(role))
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus,
      ...(role ? { role } : {}),
      ...(departmentId !== undefined ? { departmentId: departmentId || null } : {}),
    },
  });
  return NextResponse.json(user);
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const parsed = adminUserCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid user details." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();
  const departmentId = data.role === Role.DEPARTMENT_LEAD ? data.departmentId! : null;

  if (departmentId && !(await prisma.department.findUnique({ where: { id: departmentId } }))) {
    return NextResponse.json({ error: "Selected department does not exist." }, { status: 400 });
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const [employeeIdResult] = await tx.$queryRaw<{ employeeId: string }[]>`
        SELECT 'EMP' || LPAD(nextval('"User_employeeId_seq"')::TEXT, 3, '0') AS "employeeId"
      `;
      const createdUser = await tx.user.create({
        data: {
          employeeId: employeeIdResult.employeeId,
          name: data.name,
          email,
          password: await hashPassword(data.password),
          role: data.role,
          designation: data.designation || null,
          departmentId,
          accountStatus: "ACTIVE",
        },
      });

      if (data.role === Role.DEPARTMENT_LEAD && departmentId) {
        await tx.employee.upsert({
          where: { email },
          update: {
            name: data.name,
            designation: data.designation || null,
            departmentId,
          },
          create: {
            name: data.name,
            email,
            designation: data.designation || null,
            departmentId,
          },
        });
      }

      return createdUser;
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "That employee ID or work email is already in use." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Could not create user." }, { status: 500 });
  }
}

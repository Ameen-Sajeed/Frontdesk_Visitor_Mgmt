import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

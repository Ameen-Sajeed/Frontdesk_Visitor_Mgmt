import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      designation: true,
      availabilityStatus: true,
      customStatus: true,
      customStatusEmoji: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      designation: user.designation,
      availabilityStatus: user.availabilityStatus,
      customStatus: user.customStatus,
      customStatusEmoji: user.customStatusEmoji,
      departmentId: user.departmentId,
      departmentName: user.department?.name ?? null,
    },
  });
}

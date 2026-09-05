import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session || session.role !== "RECEPTIONIST") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const departmentId = new URL(request.url).searchParams.get("departmentId");
  if (!departmentId) return NextResponse.json({ onlineUserIds: [] });

  const users = await prisma.user.findMany({ where: { departmentId }, select: { id: true } });
  const onlineUsers = ((global as any).onlineUserIds as Map<string, Set<string>> | undefined) ?? new Map();
  return NextResponse.json({
    onlineUserIds: users.filter((user) => onlineUsers.has(user.id)).map((user) => user.id),
  });
}

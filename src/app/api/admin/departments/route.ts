import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAuthSession();
  if (session?.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  return NextResponse.json(
    await prisma.department.findMany({
      include: { _count: { select: { users: true, employees: true } } },
      orderBy: { name: "asc" },
    }),
  );
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (session?.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2)
    return NextResponse.json({ error: "Enter a department name." }, { status: 400 });
  try {
    return NextResponse.json(await prisma.department.create({ data: { name } }), { status: 201 });
  } catch {
    return NextResponse.json({ error: "That department already exists." }, { status: 400 });
  }
}

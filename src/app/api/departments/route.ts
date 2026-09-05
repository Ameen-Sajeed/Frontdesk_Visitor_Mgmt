import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(departments);
  } catch {
    return NextResponse.json({ error: "Failed to fetch departments." }, { status: 500 });
  }
}

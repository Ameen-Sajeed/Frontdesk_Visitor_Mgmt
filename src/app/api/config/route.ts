import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  try {
    const configs = await prisma.appConfig.findMany();
    const configMap: Record<string, string> = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }

    return NextResponse.json({
      wait_threshold_minutes: configMap.wait_threshold_minutes || "30",
    });
  } catch {
    return NextResponse.json({ wait_threshold_minutes: "30" });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key, value } = await request.json();
    if (
      key !== "wait_threshold_minutes" ||
      typeof value !== "string" ||
      !/^[1-9]\d{0,3}$/.test(value)
    ) {
      return NextResponse.json({ error: "Invalid configuration key/value." }, { status: 400 });
    }

    const config = await prisma.appConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update config." },
      { status: 500 },
    );
  }
}

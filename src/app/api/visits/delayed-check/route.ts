import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
// Shared with the Socket.IO server so the database workflow has one owner.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { notifyDelayedVisits } = require("@/lib/delayed-visits");

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "RECEPTIONIST") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const delayedVisits = await notifyDelayedVisits((global as any).io);
    return NextResponse.json({ notifiedCount: delayedVisits.length, delayedVisits });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed checking delayed visits." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { createVisit, visitInclude } from "@/lib/visits";
import { prisma } from "@/lib/prisma";
import { broadcastVisitCreated } from "@/lib/socket-emitter";
import { getAuthSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session || session.role !== "RECEPTIONIST") {
      return NextResponse.json({ error: "Only reception can register visitors." }, { status: 403 });
    }
    const createdVisit = await createVisit(await request.json(), session.userId);

    // Fetch visit with full relations for real-time notifications
    const visitWithDetails = await prisma.visit.findUnique({
      where: { id: createdVisit.id },
      include: visitInclude,
    });

    if (visitWithDetails) {
      await broadcastVisitCreated(visitWithDetails);
    }

    return NextResponse.json(visitWithDetails || createdVisit, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to register visitor." },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";
import { createVisit, visitInclude } from "@/lib/visits";
import { prisma } from "@/lib/prisma";
import { broadcastVisitCreated } from "@/lib/socket-emitter";

export async function POST(request: Request) {
  try {
    const createdVisit = await createVisit(await request.json());
    
    // Fetch visit with full relations for real-time notifications
    const visitWithDetails = await prisma.visit.findUnique({
      where: { id: createdVisit.id },
      include: visitInclude,
    });

    if (visitWithDetails) {
      broadcastVisitCreated(visitWithDetails);
    }

    return NextResponse.json(visitWithDetails || createdVisit, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to register visitor." },
      { status: 400 },
    );
  }
}

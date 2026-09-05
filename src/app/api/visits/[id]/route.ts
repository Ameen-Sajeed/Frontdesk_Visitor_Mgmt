import { NextResponse } from "next/server";
import { VisitStatus } from "@prisma/client";
import { changeVisitStatus, visitInclude } from "@/lib/visits";
import { prisma } from "@/lib/prisma";
import { broadcastVisitStatusChanged } from "@/lib/socket-emitter";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, rejectionReason, leftReason } = body;
    if (!Object.values(VisitStatus).includes(status)) throw new Error("Invalid visit status.");
    
    const updatedVisit = await changeVisitStatus(id, status, { rejectionReason, leftReason });

    const visitWithDetails = await prisma.visit.findUnique({
      where: { id: updatedVisit.id },
      include: visitInclude,
    });

    if (visitWithDetails) {
      broadcastVisitStatusChanged(visitWithDetails);
    }

    return NextResponse.json(visitWithDetails || updatedVisit);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update visit." },
      { status: 400 },
    );
  }
}

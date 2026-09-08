import { NextResponse } from "next/server";
import { ApprovalStatus, VisitStatus } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { visitInclude } from "@/lib/visits";
import { broadcastVisitorReminder } from "@/lib/socket-emitter";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session || session.role !== "RECEPTIONIST") {
    return NextResponse.json({ error: "Only reception can send visitor alerts." }, { status: 403 });
  }

  const { id } = await params;
  const visit = await prisma.visit.findUnique({ where: { id }, include: visitInclude });
  if (!visit) return NextResponse.json({ error: "Visit not found." }, { status: 404 });
  if (visit.status !== VisitStatus.WAITING || visit.approvalStatus !== ApprovalStatus.PENDING) {
    return NextResponse.json(
      { error: "Only visitors waiting for approval can be alerted." },
      { status: 400 },
    );
  }

  await broadcastVisitorReminder(visit);
  return NextResponse.json({ success: true });
}

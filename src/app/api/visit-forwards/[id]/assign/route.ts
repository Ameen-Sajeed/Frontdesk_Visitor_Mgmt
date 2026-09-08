import { NextResponse } from "next/server";
import { ApprovalStatus, VisitStatus } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { visitInclude } from "@/lib/visits";
import { broadcastVisitCreated, broadcastVisitStatusChanged } from "@/lib/socket-emitter";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session || session.role !== "RECEPTIONIST") {
    return NextResponse.json(
      { error: "Only reception can assign forwarded visitors." },
      { status: 403 },
    );
  }
  const { id } = await params;
  const body = await request.json();
  const hostId = typeof body.hostId === "string" ? body.hostId : "";
  const priority =
    Number.isInteger(body.priority) && body.priority >= 0 && body.priority <= 2 ? body.priority : 0;
  if (!hostId)
    return NextResponse.json(
      { error: "Choose a host for this forwarded visitor." },
      { status: 400 },
    );

  const forwardRequest = await prisma.visitForwardRequest.findUnique({ where: { id } });
  if (!forwardRequest || forwardRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: "This forwarding request is no longer available." },
      { status: 404 },
    );
  }
  const visit = await prisma.visit.findUnique({
    where: { id: forwardRequest.visitId },
    select: { status: true, hostId: true },
  });
  if (!visit || visit.status !== VisitStatus.INSIDE) {
    return NextResponse.json(
      { error: "This visitor is no longer in a meeting and cannot be reassigned." },
      { status: 400 },
    );
  }
  const host = await prisma.employee.findFirst({
    where: { id: hostId, departmentId: forwardRequest.toDepartmentId },
  });
  if (!host)
    return NextResponse.json(
      { error: "Selected host does not belong to the target department." },
      { status: 400 },
    );
  if (host.id === visit.hostId) {
    return NextResponse.json(
      { error: "Choose a different host for this handoff." },
      { status: 400 },
    );
  }
  const targetDepartment = await prisma.department.findUniqueOrThrow({
    where: { id: forwardRequest.toDepartmentId },
  });
  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.update({
      where: { id: forwardRequest.visitId },
      data: {
        departmentId: targetDepartment.id,
        hostId: host.id,
        priority,
        status: VisitStatus.WAITING,
        approvalStatus: ApprovalStatus.PENDING,
        approvalAskedAt: now,
        decidedAt: null,
      },
    });
    await tx.visitForwardRequest.update({
      where: { id },
      data: { status: "COMPLETED", handledAt: now, handledByUserId: session.userId },
    });
    await tx.visitStatusHistory.create({
      data: {
        visitId: visit.id,
        status: VisitStatus.WAITING,
        changedByUserId: session.userId,
        note: `Forwarded to ${targetDepartment.name} and assigned to ${host.name}${priority ? ` (priority ${priority})` : ""}`,
      },
    });
    return visit;
  });
  const visitWithDetails = await prisma.visit.findUnique({
    where: { id: updated.id },
    include: visitInclude,
  });
  if (visitWithDetails) {
    await broadcastVisitCreated(visitWithDetails);
    await broadcastVisitStatusChanged(visitWithDetails);
  }
  return NextResponse.json(visitWithDetails || updated);
}

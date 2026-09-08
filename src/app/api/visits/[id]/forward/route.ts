import { NextResponse } from "next/server";
import { VisitStatus } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { visitInclude } from "@/lib/visits";
import { broadcastVisitForwardRequested } from "@/lib/socket-emitter";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session || session.role !== "DEPARTMENT_LEAD" || !session.departmentId) {
    return NextResponse.json(
      { error: "Only department users can forward visitors." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const body: Record<string, unknown> = await request.json();
  const toDepartmentId = typeof body.toDepartmentId === "string" ? body.toDepartmentId : "";
  const suggestedHostIds = Array.isArray(body.suggestedHostIds)
    ? body.suggestedHostIds.filter(
        (hostId: unknown): hostId is string => typeof hostId === "string",
      )
    : [];
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

  const visit = await prisma.visit.findUnique({ where: { id }, include: visitInclude });
  if (!visit) return NextResponse.json({ error: "Visit not found." }, { status: 404 });
  if (visit.departmentId !== session.departmentId || visit.host.email !== session.email) {
    return NextResponse.json({ error: "You cannot forward this visitor." }, { status: 403 });
  }
  if (visit.status !== VisitStatus.INSIDE) {
    return NextResponse.json(
      { error: "Only visitors currently in a meeting can be forwarded." },
      { status: 400 },
    );
  }
  if (!toDepartmentId) {
    return NextResponse.json({ error: "Choose a department." }, { status: 400 });
  }
  const targetDepartment = await prisma.department.findUnique({ where: { id: toDepartmentId } });
  if (!targetDepartment)
    return NextResponse.json({ error: "Selected department does not exist." }, { status: 400 });
  if (suggestedHostIds.length) {
    const validCount = await prisma.employee.count({
      where: { id: { in: suggestedHostIds }, departmentId: toDepartmentId },
    });
    if (validCount !== suggestedHostIds.length) {
      return NextResponse.json(
        { error: "Suggested people must belong to the selected department." },
        { status: 400 },
      );
    }
  }
  if (suggestedHostIds.includes(visit.hostId)) {
    return NextResponse.json({ error: "Choose another person for this handoff." }, { status: 400 });
  }
  if (await prisma.visitForwardRequest.findFirst({ where: { visitId: id, status: "PENDING" } })) {
    return NextResponse.json(
      { error: "This visitor already has a forwarding request with Reception." },
      { status: 400 },
    );
  }

  const forwardRequest = await prisma.$transaction(async (tx) => {
    const created = await tx.visitForwardRequest.create({
      data: {
        visitId: id,
        fromDepartmentId: session.departmentId!,
        toDepartmentId,
        suggestedHostIds,
        note: note || null,
        requestedByUserId: session.userId,
      },
    });
    await tx.visitStatusHistory.create({
      data: {
        visitId: id,
        status: VisitStatus.INSIDE,
        changedByUserId: session.userId,
        note: `Forward requested to ${targetDepartment.name}${note ? `: ${note}` : ""}`,
      },
    });
    return created;
  });

  broadcastVisitForwardRequested({
    ...forwardRequest,
    visit,
    fromDepartmentName: visit.department.name,
    toDepartmentName: targetDepartment.name,
  });
  return NextResponse.json(forwardRequest, { status: 201 });
}

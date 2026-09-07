import { NextResponse } from "next/server";
import { ApprovalStatus, VisitStatus } from "@prisma/client";
import { changeVisitStatus, decideVisit, visitInclude } from "@/lib/visits";
import { prisma } from "@/lib/prisma";
import { broadcastVisitStatusChanged } from "@/lib/socket-emitter";
import { getAuthSession } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, action, rejectionReason, leftReason } = body;
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const current = await prisma.visit.findUnique({
      where: { id },
      select: {
        departmentId: true,
        status: true,
        approvalStatus: true,
        host: { select: { email: true } },
      },
    });
    if (!current) return NextResponse.json({ error: "Visit not found." }, { status: 404 });
    const departmentAction = action === "APPROVE" || action === "REJECT";
    if (departmentAction) {
      if (
        session.role !== "DEPARTMENT_LEAD" ||
        session.departmentId !== current.departmentId ||
        session.email !== current.host.email
      ) {
        return NextResponse.json({ error: "You cannot decide this visit." }, { status: 403 });
      }
    } else if (session.role !== "RECEPTIONIST") {
      return NextResponse.json({ error: "Only reception can update this visit." }, { status: 403 });
    }
    if (departmentAction && typeof rejectionReason === "string" && rejectionReason.length > 500) {
      throw new Error("Rejection comment is too long.");
    }
    if (
      status === VisitStatus.LEFT_WITHOUT_MEETING &&
      typeof leftReason === "string" &&
      leftReason.length > 500
    ) {
      throw new Error("Left-without-meeting reason is too long.");
    }

    let updatedVisit;
    if (departmentAction) {
      updatedVisit = await decideVisit(
        id,
        action === "APPROVE" ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        session.userId,
        rejectionReason,
      );
    } else {
      if (!Object.values(VisitStatus).includes(status)) throw new Error("Invalid visit status.");
      if (status === VisitStatus.INSIDE && current.approvalStatus !== ApprovalStatus.APPROVED) {
        return NextResponse.json(
          { error: "A department lead must approve the visitor first." },
          { status: 400 },
        );
      }
      updatedVisit = await changeVisitStatus(id, status, session.userId, { leftReason });
    }

    const visitWithDetails = await prisma.visit.findUnique({
      where: { id: updatedVisit.id },
      include: visitInclude,
    });

    if (visitWithDetails) {
      await broadcastVisitStatusChanged(visitWithDetails);
    }

    return NextResponse.json(visitWithDetails || updatedVisit);
  } catch (error) {
    const statusCode = error instanceof Error && error.message === "Visit not found." ? 404 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update visit." },
      { status: statusCode },
    );
  }
}

import { NextResponse } from "next/server";
import { VisitStatus } from "@prisma/client";
import { changeVisitStatus } from "@/lib/visits";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const { id } = await params; const { status } = await request.json(); if (!Object.values(VisitStatus).includes(status)) throw new Error("Invalid visit status."); const visit = await changeVisitStatus(id, status); return NextResponse.json(visit); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update visit." }, { status: 400 }); } }

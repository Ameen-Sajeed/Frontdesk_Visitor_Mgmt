import { NextResponse } from "next/server";
import { createVisit } from "@/lib/visits";

export async function POST(request: Request) { try { const visit = await createVisit(await request.json()); return NextResponse.json(visit, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to register visitor." }, { status: 400 }); } }

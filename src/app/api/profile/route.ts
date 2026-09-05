import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  getAuthSession,
  hashPassword,
  signToken,
  verifyPassword,
} from "@/lib/auth";
import { broadcastUserAvailabilityChanged } from "@/lib/socket-emitter";

const statuses = ["ACTIVE", "AWAY", "CUSTOM"];

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const recentStatuses = await prisma.userCustomStatus.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
    take: 4,
    select: { id: true, emoji: true, text: true },
  });
  return NextResponse.json({ recentStatuses });
}

export async function PATCH(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    const body = await request.json();
    const intent = body.intent === "status" || body.intent === "password" ? body.intent : "profile";
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user)
      return NextResponse.json({ error: "Your account could not be found." }, { status: 404 });

    if (intent === "status") return updateStatus(user, session.sessionId, body);
    if (intent === "password") return changePassword(user, session.sessionId, body);
    return updateProfile(user, session.sessionId, body);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update your profile." },
      { status: 500 },
    );
  }
}

async function updateProfile(
  user: Awaited<ReturnType<typeof prisma.user.findUnique>> & {},
  sessionId: string | null | undefined,
  body: Record<string, unknown>,
) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const designation = typeof body.designation === "string" ? body.designation.trim() : "";
  if (!name || name.length < 2)
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Please enter a valid work email." }, { status: 400 });

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.user.update({
      where: { id: user!.id },
      data: { name, email, designation: designation || null },
    });
    if (next.role === "DEPARTMENT_LEAD" && next.departmentId) {
      await tx.employee.updateMany({
        where: { email: user!.email, departmentId: next.departmentId },
        data: { name: next.name, email: next.email, designation: next.designation },
      });
    }
    return next;
  });
  return responseWithSession(updated, sessionId);
}

async function updateStatus(
  user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>,
  sessionId: string | null | undefined,
  body: Record<string, unknown>,
) {
  const availabilityStatus =
    typeof body.availabilityStatus === "string" && statuses.includes(body.availabilityStatus)
      ? body.availabilityStatus
      : "ACTIVE";
  const text = typeof body.customStatus === "string" ? body.customStatus.trim().slice(0, 60) : "";
  const emoji =
    typeof body.customStatusEmoji === "string" ? body.customStatusEmoji.slice(0, 8) : "";
  if (availabilityStatus === "CUSTOM" && !text)
    return NextResponse.json({ error: "Add a custom status message." }, { status: 400 });

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.user.update({
      where: { id: user.id },
      data: {
        availabilityStatus,
        customStatus: availabilityStatus === "CUSTOM" ? text : null,
        customStatusEmoji: availabilityStatus === "CUSTOM" ? emoji || null : null,
      },
    });
    if (availabilityStatus === "CUSTOM") {
      await tx.userCustomStatus.upsert({
        where: { userId_emoji_text: { userId: user.id, emoji: emoji || "💬", text } },
        update: {},
        create: { userId: user.id, emoji: emoji || "💬", text },
      });
    }
    return next;
  });
  broadcastUserAvailabilityChanged(updated);
  return responseWithSession(updated, sessionId);
}

async function changePassword(
  user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>,
  sessionId: string | null | undefined,
  body: Record<string, unknown>,
) {
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  if (!(await verifyPassword(currentPassword, user.password)))
    return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
  if (newPassword.length < 6)
    return NextResponse.json(
      { error: "New password must be at least 6 characters." },
      { status: 400 },
    );
  if (newPassword !== confirmPassword)
    return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(newPassword) },
  });
  if (sessionId) await closeSession(sessionId);
  const response = NextResponse.json({ passwordChanged: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}

async function responseWithSession(
  user: {
    id: string;
    name: string;
    email: string;
    role: any;
    designation: string | null;
    departmentId: string | null;
    availabilityStatus: string;
    customStatus: string | null;
    customStatusEmoji: string | null;
  },
  sessionId?: string | null,
) {
  const token = await signToken({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    designation: user.designation,
    departmentId: user.departmentId,
    availabilityStatus: user.availabilityStatus,
    customStatus: user.customStatus,
    customStatusEmoji: user.customStatusEmoji,
    sessionId,
  });
  const response = NextResponse.json({ user });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

async function closeSession(id: string) {
  const active = await prisma.userSession.findUnique({ where: { id } });
  if (!active || active.logoutAt) return;
  const logoutAt = new Date();
  await prisma.userSession.update({
    where: { id },
    data: {
      logoutAt,
      durationSeconds: Math.max(
        0,
        Math.floor((logoutAt.getTime() - active.loginAt.getTime()) / 1000),
      ),
    },
  });
}

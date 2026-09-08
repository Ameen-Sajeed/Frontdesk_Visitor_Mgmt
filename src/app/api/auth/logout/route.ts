import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getAuthSession();
  if (session?.sessionId) {
    const logoutAt = new Date();
    const activeSession = await prisma.userSession.findUnique({ where: { id: session.sessionId } });
    if (activeSession && !activeSession.logoutAt) {
      await prisma.userSession.update({
        where: { id: activeSession.id },
        data: {
          logoutAt,
          durationSeconds: Math.max(
            0,
            Math.floor((logoutAt.getTime() - activeSession.loginAt.getTime()) / 1000),
          ),
        },
      });
    }
  }
  const response = NextResponse.json({ success: true });
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

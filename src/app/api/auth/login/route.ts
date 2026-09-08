import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, signToken, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, email, password } = body;

    const loginIdentifier =
      typeof identifier === "string"
        ? identifier.trim()
        : typeof email === "string"
          ? email.trim()
          : "";
    const trimmedPassword = typeof password === "string" ? password : "";

    if (!loginIdentifier || !trimmedPassword) {
      return NextResponse.json(
        { error: "Employee ID or email and password are required." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: loginIdentifier.includes("@")
        ? { email: loginIdentifier.toLowerCase() }
        : { employeeId: loginIdentifier.toUpperCase() },
      include: { department: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    if (user.accountStatus === "PENDING") {
      return NextResponse.json(
        { error: "Your account is awaiting administrator approval. Please try again later." },
        { status: 403 },
      );
    }
    if (user.accountStatus === "BLOCKED") {
      return NextResponse.json(
        { error: "This account has been blocked. Please contact an administrator." },
        { status: 403 },
      );
    }

    const isValidPassword = await verifyPassword(trimmedPassword, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const session = await prisma.userSession.create({ data: { userId: user.id } });
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
      sessionId: session.id,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        departmentId: user.departmentId,
        departmentName: user.department?.name,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sign in failed." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, hashPassword, signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, confirmPassword, role, departmentId, designation } = body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const trimmedPassword = typeof password === "string" ? password : "";
    const trimmedConfirm = typeof confirmPassword === "string" ? confirmPassword : "";
    const trimmedDesignation = typeof designation === "string" ? designation.trim() : "";

    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: "Please enter a valid work email." }, { status: 400 });
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    if (trimmedConfirm && trimmedPassword !== trimmedConfirm) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    if (role !== Role.RECEPTIONIST && role !== Role.DEPARTMENT_LEAD) {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
    }

    if (role === Role.DEPARTMENT_LEAD && (!departmentId || typeof departmentId !== "string")) {
      return NextResponse.json(
        { error: "Department is required for Department users." },
        { status: 400 },
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 },
      );
    }

    // Validate department if specified
    let targetDeptId: string | null = null;
    if (role === Role.DEPARTMENT_LEAD && departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept) {
        return NextResponse.json({ error: "Selected department does not exist." }, { status: 400 });
      }
      targetDeptId = dept.id;
    }

    const hashedPassword = await hashPassword(trimmedPassword);

    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        password: hashedPassword,
        role: role as Role,
        designation: trimmedDesignation || null,
        departmentId: targetDeptId,
      },
    });

    // If Department user, ensure an Employee host record exists so visitor registration can select them
    if (role === Role.DEPARTMENT_LEAD && targetDeptId) {
      await prisma.employee.upsert({
        where: { email: trimmedEmail },
        update: {
          name: trimmedName,
          departmentId: targetDeptId,
          designation: trimmedDesignation || null,
        },
        create: {
          name: trimmedName,
          email: trimmedEmail,
          departmentId: targetDeptId,
          designation: trimmedDesignation || null,
        },
      });
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

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          designation: user.designation,
          departmentId: user.departmentId,
        },
      },
      { status: 201 },
    );

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
      { error: error instanceof Error ? error.message : "Registration failed." },
      { status: 500 },
    );
  }
}

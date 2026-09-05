import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

export interface AuthUserPayload {
  userId: string;
  name: string;
  email: string;
  role: Role;
  designation?: string | null;
  departmentId?: string | null;
  availabilityStatus?: string;
  customStatus?: string | null;
  customStatusEmoji?: string | null;
  sessionId?: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET || "frontdesk-jwt-secret-key-2-day-task-2026";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export const AUTH_COOKIE_NAME = "auth_token";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: AuthUserPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<AuthUserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      userId: payload.userId as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as Role,
      designation: (payload.designation as string) || null,
      departmentId: (payload.departmentId as string) || null,
      availabilityStatus: (payload.availabilityStatus as string) || "ACTIVE",
      customStatus: (payload.customStatus as string) || null,
      customStatusEmoji: (payload.customStatusEmoji as string) || null,
      sessionId: (payload.sessionId as string) || null,
    };
  } catch {
    return null;
  }
}

export async function getAuthSession(): Promise<AuthUserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

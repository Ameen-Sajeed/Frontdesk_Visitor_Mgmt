import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "auth_token";
const JWT_SECRET = process.env.JWT_SECRET || "frontdesk-jwt-secret-key-2-day-task-2026";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  let session: { role?: string; departmentId?: string } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secretKey);
      session = payload as { role?: string; departmentId?: string };
    } catch {
      session = null;
    }
  }

  const isAuthPage = pathname === "/login";
  const isProtectedApi = pathname.startsWith("/api/visits") || pathname.startsWith("/api/visitors") || pathname.startsWith("/api/export") || pathname.startsWith("/api/config");
  const isProtectedRoute = pathname === "/" || pathname.startsWith("/dashboard") || pathname.startsWith("/department");

  // Handle protected API routes
  if (isProtectedApi && !session) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }

  // Handle /login page access for authenticated users
  if (isAuthPage && session) {
    const targetUrl = session.role === "DEPARTMENT_LEAD" ? "/department" : "/dashboard";
    return NextResponse.redirect(new URL(targetUrl, request.url));
  }

  // Handle protected pages for unauthenticated users
  if (isProtectedRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect Department Users accessing Receptionist dashboard to /department
  if ((pathname === "/" || pathname === "/dashboard") && session?.role === "DEPARTMENT_LEAD") {
    return NextResponse.redirect(new URL("/department", request.url));
  }

  // Redirect Receptionists accessing Department workspace to /dashboard
  if (pathname.startsWith("/department") && session?.role === "RECEPTIONIST") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/department/:path*", "/login", "/api/visits/:path*", "/api/visitors/:path*", "/api/export/:path*", "/api/config/:path*"],
};

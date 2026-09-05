"use client";

import Link from "next/link";
import { useState } from "react";

interface UserNavProps {
  user?: {
    name: string;
    email: string;
    role: string;
    designation?: string | null;
    departmentName?: string | null;
  } | null;
}

export function UserNav({ user }: UserNavProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const isDepartmentUser = user?.role === "DEPARTMENT_LEAD";
  const roleLabel = isDepartmentUser
    ? user?.designation
      ? `${user.designation} · ${user.departmentName ?? "Department"}`
      : `${user?.departmentName ?? "Department"}`
    : "Receptionist";

  return (
    <nav className="nav">
      <div className="brand">
        <Link href={isDepartmentUser ? "/department" : "/dashboard"} style={{ color: "inherit", textDecoration: "none" }}>
          front<i>desk</i>
        </Link>
      </div>

      {/* <div className="nav-links">
        {isDepartmentUser ? (
          <Link href="/department">My Visitors</Link>
        ) : (
          <Link href="/dashboard">Reception</Link>
        )}
      </div> */}

      {user && (
        <div className="user-profile" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600, fontSize: "0.875rem", lineHeight: "1.2" }}>{user.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>{roleLabel}</div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="secondary"
            style={{
              padding: "6px 12px",
              fontSize: "0.8125rem",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </nav>
  );
}

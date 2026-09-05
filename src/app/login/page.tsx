"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Role = "RECEPTIONIST" | "DEPARTMENT_LEAD";

interface DepartmentOption {
  id: string;
  name: string;
}

export default function LoginPage() {
  const [role, setRole] = useState<Role>("RECEPTIONIST");
  const [isRegistering, setIsRegistering] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/departments")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDepartments(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegistering && password !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
      const payload = isRegistering
        ? { name, email, password, confirmPassword, role, departmentId, designation }
        : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      // Successful auth - redirect based on user role
      const userRole = data.user?.role;
      if (userRole === "DEPARTMENT_LEAD") {
        window.location.href = "/department";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-container">
        {/* Brand */}
        <Link href="/" className="auth-brand">
          front<i>desk</i>
        </Link>

        {/* Intro */}
        <div className="auth-header">
          <p className="eyebrow">
            {isRegistering ? "Create your account" : "Welcome back"}
          </p>

          <h1>
            {isRegistering
              ? "Get started with frontdesk."
              : "Sign in to frontdesk."}
          </h1>

          <p className="auth-sub">
            {isRegistering
              ? "Set up your workspace access in a few seconds."
              : "Sign in to manage visitors and department queues."}
          </p>
        </div>

        {/* Auth card */}
        <div className="auth-card">
          {/* Error Banner */}
          {error && (
            <div
              className="auth-error-banner"
              style={{
                padding: "10px 14px",
                marginBottom: 16,
                borderRadius: 8,
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          {/* Role selector */}
          {isRegistering && (
            <div className="role-switch">
              <button
                type="button"
                className={role === "RECEPTIONIST" ? "active" : ""}
                onClick={() => setRole("RECEPTIONIST")}
              >
                Receptionist
              </button>

              <button
                type="button"
                className={role === "DEPARTMENT_LEAD" ? "active" : ""}
                onClick={() => setRole("DEPARTMENT_LEAD")}
              >
                Department
              </button>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegistering && (
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g. Ahmed Khan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="email">Work email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {isRegistering && role === "DEPARTMENT_LEAD" && (
              <>
                <div className="field">
                  <label htmlFor="department">Department</label>
                  <select
                    id="department"
                    name="department"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    required
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="designation">Designation</label>
                  <input
                    id="designation"
                    name="designation"
                    type="text"
                    placeholder="e.g. IT Manager"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="field">
              <div className="field-label">
                <label htmlFor="password">Password</label>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: "40px" }}
                  autoComplete={
                    isRegistering ? "new-password" : "current-password"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: "var(--muted, #64748b)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOffIcon />
                  ) : (
                    <EyeIcon />
                  )}
                </button>
              </div>
            </div>

            {isRegistering && (
              <div className="field">
                <div className="field-label">
                  <label htmlFor="confirmPassword">Confirm password</label>
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ paddingRight: "40px" }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      color: "var(--muted, #64748b)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon />
                    ) : (
                      <EyeIcon />
                    )}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading
                ? isRegistering
                  ? "Creating account…"
                  : "Signing in…"
                : isRegistering
                ? "Create account"
                : "Sign in"}
            </button>
          </form>

          <div className="auth-divider">
            <span />
            <small>or</small>
            <span />
          </div>

          <p className="auth-switch">
            {isRegistering
              ? "Already have an account?"
              : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsRegistering((val) => !val);
                setError(null);
              }}
            >
              {isRegistering ? "Sign in" : "Create account"}
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="auth-footer">
          <span className="footer-dot" />
          Visitor management, made simple.
        </div>
      </div>
    </main>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

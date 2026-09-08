"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Authentication failed.");
      window.location.href =
        data.user?.role === "ADMIN"
          ? "/admin"
          : data.user?.role === "DEPARTMENT_LEAD"
            ? "/department"
            : "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-container">
        <Link href="/" className="auth-brand">
          arri<i>Vo</i>
        </Link>
        <div className="auth-header">
          <p className="eyebrow">Welcome back</p>
          <h1>Sign in to arriVo.</h1>
          {/* <p className="auth-sub">Use your Employee ID or work email to access your workspace.</p> */}
        </div>
        <div className="auth-card">
          {error && <div className="auth-error-banner">{error}</div>}
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="identifier">Employee ID or Email</label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="EMP001 or you@company.com"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "◉" : "○"}
                </button>
              </div>
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="auth-sub">Need an account? Please contact an administrator.</p>
        </div>
        <div className="auth-footer">
          <span className="footer-dot" />
          Visitor management, made simple.
        </div>
      </div>
    </main>
  );
}

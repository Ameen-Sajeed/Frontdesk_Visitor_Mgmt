"use client";

import { useState } from "react";
import Link from "next/link";

type Role = "RECEPTIONIST" | "DEPARTMENT_LEAD";

export default function LoginPage() {
  const [role, setRole] = useState<Role>("RECEPTIONIST");
  const [isRegistering, setIsRegistering] = useState(false);

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
              : "Welcome back."}
          </h1>

          <p className="auth-sub">
            {isRegistering
              ? "Set up your workspace access in a few seconds."
              : "Sign in to manage visitors and approvals."}
          </p>
        </div>

        {/* Auth card */}
        <div className="auth-card">
          {/* Role selector */}
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
              Department lead
            </button>
          </div>

          <form className="auth-form">
            {isRegistering && (
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Smith"
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
                autoComplete="email"
              />
            </div>

            {isRegistering && role === "DEPARTMENT_LEAD" && (
              <div className="field">
                <label htmlFor="department">Department</label>

                <select id="department" name="department">
                  <option value="">Select department</option>
                  <option value="HR">Human Resources</option>
                  <option value="FINANCE">Finance</option>
                  <option value="IT">IT</option>
                  <option value="SALES">Sales</option>
                  <option value="OPERATIONS">Operations</option>
                </select>
              </div>
            )}

            <div className="field">
              <div className="field-label">
                <label htmlFor="password">Password</label>

                {!isRegistering && (
                  <button type="button" className="forgot">
                    Forgot password?
                  </button>
                )}
              </div>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete={
                  isRegistering ? "new-password" : "current-password"
                }
              />
            </div>

            <button type="submit" className="auth-submit">
              {isRegistering ? "Create account" : "Sign in"}
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
              onClick={() => setIsRegistering((value) => !value)}
            >
              {isRegistering ? "Sign in" : "Create account"}
            </button>
          </p>
        </div>

        {/* Small visual / supporting text */}
        <div className="auth-footer">
          <span className="footer-dot" />
          Visitor management, made simple.
        </div>
      </div>
    </main>
  );
}
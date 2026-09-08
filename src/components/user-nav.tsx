"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  name: string;
  email: string;
  role: string;
  designation?: string | null;
  departmentName?: string | null;
  availabilityStatus?: string;
  customStatus?: string | null;
  customStatusEmoji?: string | null;
};
type RecentStatus = { id: string; emoji: string; text: string };

export function UserNav({ user }: { user?: User | null }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [confirmPasswordChange, setConfirmPasswordChange] = useState(false);
  const [presence, setPresence] = useState<"online" | "offline">("offline");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [designation, setDesignation] = useState(user?.designation ?? "");
  const [status, setStatus] = useState(user?.availabilityStatus ?? "ACTIVE");
  const [customText, setCustomText] = useState("");
  const [customEmoji, setCustomEmoji] = useState("💬");
  const [recentStatuses, setRecentStatuses] = useState<RecentStatus[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setDesignation(user?.designation ?? "");
    setStatus(user?.availabilityStatus ?? "ACTIVE");
  }, [user?.name, user?.email, user?.designation, user?.availabilityStatus]);
  useEffect(() => {
    const update = (event: Event) =>
      setPresence((event as CustomEvent<"online" | "offline">).detail);
    window.addEventListener("arrivo:socket-presence", update);
    return () => window.removeEventListener("arrivo:socket-presence", update);
  }, []);

  const roleLabel =
    user?.role === "ADMIN"
      ? "Admin"
      : user?.role === "DEPARTMENT_LEAD"
        ? user.designation
          ? `${user.designation} · ${user.departmentName ?? "Department"}`
          : (user.departmentName ?? "Department")
        : user?.role === "RECEPTIONIST"
          ? "Receptionist"
          : "User";
  const clearCustomDraft = () => {
    setCustomText("");
    setCustomEmoji("💬");
    setError("");
  };
  const closeProfile = () => {
    setProfileOpen(false);
    clearCustomDraft();
    setNotice("");
  };
  const openProfile = () => {
    setMenuOpen(false);
    setError("");
    setNotice("");
    clearCustomDraft();
    setProfileOpen(true);
  };
  const profilePayload = { intent: "profile", name, email, designation };

  const request = async (body: object) => {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save your changes.");
    router.refresh();
  };
  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await request(profilePayload);
      setNotice("Profile updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };
  const chooseStatus = async (next: "ACTIVE" | "AWAY") => {
    setStatus(next);
    setError("");
    setNotice("");
    try {
      await request({ intent: "status", availabilityStatus: next });
      setNotice(next === "ACTIVE" ? "Status set to Active." : "Status set to Away.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save status.");
    }
  };
  const startCustom = async () => {
    setStatus("CUSTOM");
    setError("");
    setNotice("");
    setLoadingRecent(true);
    try {
      const response = await fetch("/api/profile");
      const data = await response.json();
      setRecentStatuses(data.recentStatuses ?? []);
    } finally {
      setLoadingRecent(false);
    }
  };
  const saveCustom = async () => {
    setSaving(true);
    setError("");
    try {
      await request({
        intent: "status",
        availabilityStatus: "CUSTOM",
        customStatus: customText,
        customStatusEmoji: customEmoji,
      });
      setNotice("Custom status saved.");
      clearCustomDraft();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save status.");
    } finally {
      setSaving(false);
    }
  };
  const logout = async () => {
    window.dispatchEvent(new Event("arrivo:socket-logout"));
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };
  const changePassword = async () => {
    setSaving(true);
    setError("");
    try {
      await request({ intent: "password", currentPassword, newPassword, confirmPassword });
      window.location.href = "/login?message=password-updated";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update password.");
      setConfirmPasswordChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <nav className="nav">
        <div className="brand">
          <Link
            href={
              user?.role === "ADMIN"
                ? "/admin"
                : user?.role === "DEPARTMENT_LEAD"
                  ? "/department"
                  : "/dashboard"
            }
          >
            arri<i>Vo</i>
          </Link>
        </div>
        {user && (
          <div className="user-profile">
            <div className="user-profile-copy">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{roleLabel}</div>
            </div>
            <div className="user-menu-wrap">
              <button
                type="button"
                className="user-menu-button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Open user menu"
                aria-expanded={menuOpen}
              >
                <span className={`presence-dot ${presence}`} />
                <span className="user-avatar">{user.name[0]?.toUpperCase()}</span>
              </button>
              {menuOpen && (
                <div className="user-menu" role="menu">
                  <div className="user-menu-heading">
                    <strong>{user.name}</strong>
                    <span>{presence === "online" ? "Online" : "Offline"}</span>
                  </div>
                  <button className="user-menu-item" onClick={openProfile}>
                    Profile settings
                  </button>
                  <button
                    className="user-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      setError("");
                      setPasswordOpen(true);
                    }}
                  >
                    Change password
                  </button>
                  <button className="user-menu-item" onClick={logout}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {profileOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="profile-title">
          <div className="modal profile-modal">
            <div className="modal-head">
              <div>
                <h2 id="profile-title">Profile settings</h2>
                <p className="small">
                  <span className={`presence-dot ${presence}`} />{" "}
                  {presence === "online" ? "Online" : "Offline"}
                </p>
              </div>
              <button
                className="icon-button"
                onClick={closeProfile}
                aria-label="Close profile settings"
              >
                ×
              </button>
            </div>
            <form className="form profile-form" onSubmit={saveProfile}>
              {error && (
                <p className="auth-error-banner profile-feedback" role="alert">
                  {error}
                </p>
              )}
              {notice && <p className="profile-success profile-feedback">{notice}</p>}
              <div className="grid">
                <div className="field">
                  <label htmlFor="profile-name">Full name</label>
                  <input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="profile-email">Work email</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="field full">
                  <label htmlFor="profile-designation">Designation</label>
                  <input
                    id="profile-designation"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </div>
              </div>
              <div className="profile-status-section">
                <h3>Status</h3>
                <div className="status-options">
                  <button
                    type="button"
                    className={status === "ACTIVE" ? "selected" : ""}
                    onClick={() => chooseStatus("ACTIVE")}
                  >
                    🟢 Active
                  </button>
                  <button
                    type="button"
                    className={status === "AWAY" ? "selected" : ""}
                    onClick={() => chooseStatus("AWAY")}
                  >
                    🟡 Away
                  </button>
                  <button
                    type="button"
                    className={status === "CUSTOM" ? "selected" : ""}
                    onClick={startCustom}
                  >
                    Custom status
                  </button>
                </div>
                {status === "CUSTOM" && (
                  <div className="custom-status-editor">
                    <div className="emoji-picker">
                      {["🙂", "🍔", "📞", "🚗", "💻", "🏠"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className={customEmoji === emoji ? "selected" : ""}
                          onClick={() => setCustomEmoji(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="custom-status-input">
                      <span>{customEmoji}</span>
                      <input
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="What’s your status?"
                        maxLength={60}
                      />
                      <button
                        type="button"
                        className="status-tick"
                        onClick={saveCustom}
                        disabled={saving}
                        aria-label="Save custom status"
                      >
                        ✓
                      </button>
                    </div>
                    {loadingRecent ? (
                      <p className="small">Loading recent statuses…</p>
                    ) : (
                      recentStatuses.length > 0 && (
                        <div className="recent-statuses">
                          <span>Recent</span>
                          {recentStatuses.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setCustomEmoji(item.emoji);
                                setCustomText(item.text);
                              }}
                            >
                              {item.emoji} {item.text}
                            </button>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={closeProfile}>
                  Close
                </button>
                <button className="primary" disabled={saving}>
                  {saving ? "Saving…" : "Save profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {passwordOpen && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal reason-dialog">
            <div className="modal-head reason-dialog-head">
              <h2>Change password</h2>
            </div>
            <form
              className="reason-dialog-body"
              onSubmit={(e) => {
                e.preventDefault();
                setConfirmPasswordChange(true);
              }}
            >
              <div className="field">
                <label>Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="field">
                <label>Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="reason-actions">
                <button type="button" className="secondary" onClick={() => setPasswordOpen(false)}>
                  Cancel
                </button>
                <button className="primary">Continue</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmPasswordChange && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="modal reason-dialog">
            <div className="modal-head reason-dialog-head">
              <h2>Update password?</h2>
            </div>
            <div className="reason-dialog-body">
              <p className="small">
                For security, you’ll be signed out and need to sign in with your new password.
              </p>
              <div className="reason-actions">
                <button className="secondary" onClick={() => setConfirmPasswordChange(false)}>
                  Cancel
                </button>
                <button className="primary" onClick={changePassword} disabled={saving}>
                  {saving ? "Updating…" : "Update and sign out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

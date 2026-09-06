"use client";

import { useState } from "react";
import { Loader } from "@/components/loader";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  accountStatus: string;
  designation?: string | null;
  departmentName?: string | null;
};
type Department = { id: string; name: string; _count: { users: number; employees: number } };

export function AdminWorkspace({
  initialUsers,
  initialDepartments,
  waitThreshold,
}: {
  initialUsers: User[];
  initialDepartments: Department[];
  waitThreshold: string;
}) {
  const [tab, setTab] = useState<"users" | "departments" | "settings">("users");
  const [users, setUsers] = useState(initialUsers);
  const [departments, setDepartments] = useState(initialDepartments);
  const [departmentName, setDepartmentName] = useState("");
  const [minutes, setMinutes] = useState(waitThreshold);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function updateUser(userId: string, accountStatus: string) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, accountStatus }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      setUsers((all) =>
        all.map((user) => (user.id === userId ? { ...user, accountStatus } : user)),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update user.");
    } finally {
      setSaving(false);
    }
  }
  async function addDepartment(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: departmentName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDepartments((all) =>
        [...all, { ...data, _count: { users: 0, employees: 0 } }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setDepartmentName("");
      setMessage("Department added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add department.");
    } finally {
      setSaving(false);
    }
  }
  async function saveSettings() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "wait_threshold_minutes", value: minutes }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      setMessage("Settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="panel admin-panel">
      <div className="admin-tabs">
        {(["users", "departments", "settings"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={tab === item ? "active" : ""}
            onClick={() => {
              setTab(item);
              setMessage("");
            }}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      {message && <p className="admin-message">{message}</p>}
      {tab === "users" && (
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Department</th>
                <th>Access</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="visitor">{user.name}</div>
                    <div className="small">{user.email}</div>
                  </td>
                  <td>{user.role.replaceAll("_", " ")}</td>
                  <td>{user.departmentName ?? "—"}</td>
                  <td>
                    <span
                      className={`badge ${user.accountStatus === "ACTIVE" ? "approved" : user.accountStatus === "BLOCKED" ? "rejected" : "waiting"}`}
                    >
                      {user.accountStatus.toLowerCase()}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      {user.accountStatus !== "ACTIVE" && (
                        <button
                          className="primary"
                          disabled={saving}
                          onClick={() => updateUser(user.id, "ACTIVE")}
                        >
                          Approve
                        </button>
                      )}
                      {user.accountStatus !== "BLOCKED" && (
                        <button
                          className="danger"
                          disabled={saving}
                          onClick={() => updateUser(user.id, "BLOCKED")}
                        >
                          Block
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "departments" && (
        <div className="admin-content">
          <form className="admin-add" onSubmit={addDepartment}>
            <input
              value={departmentName}
              onChange={(event) => setDepartmentName(event.target.value)}
              placeholder="New department name"
              required
            />
            <button className="primary" disabled={saving}>
              {saving ? <Loader label="Saving" /> : "Add department"}
            </button>
          </form>
          <div className="department-grid">
            {departments.map((department) => (
              <div className="stat" key={department.id}>
                <strong>{department.name}</strong>
                <p>
                  {department._count.users} users · {department._count.employees} hosts
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "settings" && (
        <div className="admin-content">
          <div className="admin-setting">
            <div>
              <strong>Wait alert threshold</strong>
              <p className="small">Notify reception when a visitor has been waiting this long.</p>
            </div>
            <div className="actions">
              <input
                className="filter"
                type="number"
                min="1"
                max="1440"
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
              />
              <span className="small">minutes</span>
              <button className="primary" type="button" onClick={saveSettings} disabled={saving}>
                {saving ? <Loader label="Saving" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

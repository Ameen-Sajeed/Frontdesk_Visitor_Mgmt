"use client";

import { useState } from "react";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Loader } from "@/components/loader";

type User = {
  id: string;
  employeeId: string;
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
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserError, setCreateUserError] = useState("");
  const [createdEmployeeId, setCreatedEmployeeId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "RECEPTIONIST",
    departmentId: "",
    designation: "",
  });
  const [pendingUserUpdate, setPendingUserUpdate] = useState<{
    user: User;
    accountStatus: string;
  } | null>(null);
  function resetCreateUser() {
    setNewUser({
      name: "",
      email: "",
      password: "",
      role: "RECEPTIONIST",
      departmentId: "",
      designation: "",
    });
    setCreateUserError("");
    setCreatedEmployeeId(null);
  }
  function closeCreateUser() {
    setCreateUserOpen(false);
    resetCreateUser();
  }
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
  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setCreateUserError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUsers((all) => [
        {
          ...data,
          departmentName:
            departments.find((department) => department.id === data.departmentId)?.name ?? null,
        },
        ...all,
      ]);
      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "RECEPTIONIST",
        departmentId: "",
        designation: "",
      });
      setCreatedEmployeeId(data.employeeId);
    } catch (error) {
      setCreateUserError(error instanceof Error ? error.message : "Could not create user.");
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
        <div className="admin-content">
          <div className="toolbar admin-user-toolbar">
            <h2>Users ({users.length})</h2>
            <button className="primary" type="button" onClick={() => setCreateUserOpen(true)}>
              + Create user
            </button>
          </div>
          <div className="table-scroll" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Access</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  console.log(user),
                  <tr key={user.id}>
                    <td>
                      <div className="visitor">{user.name}</div>
                      <div className="small">{user.email}</div>
                    </td>
                    <td>{user.employeeId}</td>
                    <td>{user.designation}</td>
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
                            onClick={() => setPendingUserUpdate({ user, accountStatus: "ACTIVE" })}
                          >
                            Approve
                          </button>
                        )}
                        {user.accountStatus !== "BLOCKED" && (
                          <button
                            className="danger"
                            disabled={saving}
                            onClick={() => setPendingUserUpdate({ user, accountStatus: "BLOCKED" })}
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
      {pendingUserUpdate && (
        <ConfirmActionDialog
          title={pendingUserUpdate.accountStatus === "ACTIVE" ? "Approve user?" : "Block user?"}
          message={`${pendingUserUpdate.user.name} will ${pendingUserUpdate.accountStatus === "ACTIVE" ? "be able to access" : "no longer be able to access"} the workspace.`}
          confirmLabel={pendingUserUpdate.accountStatus === "ACTIVE" ? "Approve" : "Block"}
          danger={pendingUserUpdate.accountStatus === "BLOCKED"}
          loading={saving}
          onCancel={() => setPendingUserUpdate(null)}
          onConfirm={async () => {
            await updateUser(pendingUserUpdate.user.id, pendingUserUpdate.accountStatus);
            setPendingUserUpdate(null);
          }}
        />
      )}
      {createUserOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Create user">
          <div className="modal admin-user-modal">
            <div className="modal-head">
              <div>
                <h2>{createdEmployeeId ? "User created" : "Create user"}</h2>
                <p className="small">
                  {createdEmployeeId
                    ? "Share the employee ID below so the user can sign in."
                    : "New accounts are active immediately."}
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={closeCreateUser}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {createdEmployeeId ? (
              <div className="form admin-user-created">
                <span className="small">Employee ID</span>
                <strong> : {createdEmployeeId}</strong>
                <div className="form-actions">
                  <button className="primary" type="button" onClick={closeCreateUser}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form className="form" onSubmit={createUser} noValidate>
                {createUserError && <p className="error">{createUserError}</p>}
                <div className="grid">
                  <label className="field">
                    <span className="small">Full name</span>
                    <input
                      value={newUser.name}
                      onChange={(event) =>
                        setNewUser((user) => ({ ...user, name: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="small">Work email</span>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(event) =>
                        setNewUser((user) => ({ ...user, email: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="small">Temporary password</span>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(event) =>
                        setNewUser((user) => ({ ...user, password: event.target.value }))
                      }
                      minLength={6}
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="small">Role</span>
                    <select className="small"
                      value={newUser.role}
                      onChange={(event) =>
                        setNewUser((user) => ({
                          ...user,
                          role: event.target.value,
                          departmentId:
                            event.target.value === "DEPARTMENT_LEAD" ? user.departmentId : "",
                        }))
                      }
                    >
                      <option className="small" value="RECEPTIONIST">Receptionist</option>
                      <option value="DEPARTMENT_LEAD">Department user</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </label>
                  {newUser.role === "DEPARTMENT_LEAD" && (
                    <label className="field">
                      <span className="small">Department</span>
                      <select
                        value={newUser.departmentId}
                        onChange={(event) =>
                          setNewUser((user) => ({ ...user, departmentId: event.target.value }))
                        }
                        required
                      >
                        <option value="">Select department</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="field">
                    <span className="small">
                      Designation <small>(optional)</small>
                    </span>
                    <input
                      value={newUser.designation}
                      onChange={(event) =>
                        setNewUser((user) => ({ ...user, designation: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <div className="form-actions">
                  <button
                    className="secondary"
                    type="button"
                    onClick={closeCreateUser}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button className="primary" disabled={saving}>
                    {saving ? <Loader label="Creating" /> : "Create user"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

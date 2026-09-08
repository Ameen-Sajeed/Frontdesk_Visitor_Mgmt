"use client";

import { useState } from "react";
import { Loader } from "@/components/loader";

type Destination = {
  id: string;
  name: string;
  employees: { id: string; name: string; designation?: string | null }[];
};

export function ForwardVisitor({
  visitId,
  destinations,
}: {
  visitId: string;
  destinations: Destination[];
}) {
  const [open, setOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [suggestedHostId, setSuggestedHostId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedDepartment = destinations.find((department) => department.id === departmentId);

  function close() {
    setOpen(false);
    setDepartmentId("");
    setSuggestedHostId("");
    setNote("");
    setError("");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/visits/${visitId}/forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toDepartmentId: departmentId,
          suggestedHostIds: suggestedHostId ? [suggestedHostId] : [],
          note,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      close();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not forward this visitor.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <button className="secondary" type="button" onClick={() => setOpen(true)}>
        Forward
      </button>
      {open && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Forward visitor">
          <div className="modal reason-dialog">
            <div className="modal-head reason-dialog-head">
              <div>
                <h2>Forward visitor</h2>
                <p className="small">Reception will review and assign the handoff.</p>
              </div>
              <button className="icon-button" type="button" onClick={close} aria-label="Close">
                ×
              </button>
            </div>
            <form className="reason-dialog-body" onSubmit={submit}>
              {error && <p className="error">{error}</p>}
              <label className="reason-field">
                <span>Department</span>
                <select
                  className="reason-select"
                  value={departmentId}
                  onChange={(event) => {
                    setDepartmentId(event.target.value);
                    setSuggestedHostId("");
                  }}
                  required
                >
                  <option value="">Select department</option>
                  {destinations.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              {selectedDepartment && (
                <label className="reason-field">
                  <span>
                    Suggested person <em>(optional)</em>
                  </span>
                  <select
                    className="reason-select"
                    value={suggestedHostId}
                    onChange={(event) => setSuggestedHostId(event.target.value)}
                  >
                    <option value="">Let Reception choose</option>
                    {selectedDepartment.employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                        {employee.designation ? ` · ${employee.designation}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="reason-field">
                <span>
                  Note <em>(optional)</em>
                </span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Explain why this visitor should be forwarded"
                />
              </label>
              <div className="reason-actions">
                <button className="secondary" type="button" onClick={close} disabled={saving}>
                  Cancel
                </button>
                <button className="primary" disabled={saving}>
                  {saving ? <Loader label="Forwarding" /> : "Send to Reception"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

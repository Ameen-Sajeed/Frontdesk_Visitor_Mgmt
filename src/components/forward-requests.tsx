"use client";

import { useState } from "react";
import { Loader } from "@/components/loader";

export type ForwardRequest = {
  id: string;
  note?: string | null;
  suggestedHostIds: string[];
  toDepartment: {
    id: string;
    name: string;
    employees: { id: string; name: string; designation?: string | null }[];
  };
};

export function ForwardRequestAssign({ request }: { request: ForwardRequest }) {
  const [open, setOpen] = useState(false);
  const [hostId, setHostId] = useState("");
  const [priority, setPriority] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const suggestedHostId = request.suggestedHostIds[0];

  function close() {
    setOpen(false);
    setError("");
  }
  async function assign(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/visit-forwards/${request.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId, priority: Number(priority) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not assign forwarded visitor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button className="primary" type="button" onClick={() => setOpen(true)}>
        Assign
      </button>
      {open && (
        <div
          className="overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Assign forwarded visitor"
        >
          <div className="modal reason-dialog">
            <div className="modal-head reason-dialog-head">
              <div>
                <h2>Assign forwarded visitor</h2>
                <p className="small">Forwarded to {request.toDepartment.name}</p>
              </div>
              <button className="icon-button" type="button" onClick={close} aria-label="Close">
                ×
              </button>
            </div>
            <form className="reason-dialog-body" onSubmit={assign}>
              {error && <p className="error">{error}</p>}
              {request.note && <p className="small">Note: {request.note}</p>}
              <label className="reason-field">
                <span>Host</span>
                <select
                  className="reason-select"
                  value={hostId}
                  onChange={(event) => setHostId(event.target.value)}
                  required
                >
                  <option value="">Select host</option>
                  {request.toDepartment.employees.map((host) => (
                    <option key={host.id} value={host.id}>
                      {host.id === suggestedHostId ? "Suggested · " : ""}
                      {host.name}
                      {host.designation ? ` · ${host.designation}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="reason-field">
                <span>Priority</span>
                <select
                  className="reason-select"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                >
                  <option value="0">Normal</option>
                  <option value="1">Medium</option>
                  <option value="2">High</option>
                </select>
              </label>
              <div className="reason-actions">
                <button className="secondary" type="button" onClick={close} disabled={saving}>
                  Cancel
                </button>
                <button className="primary" disabled={saving}>
                  {saving ? <Loader label="Assigning" /> : "Assign and notify"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

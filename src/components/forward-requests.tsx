"use client";

import { useState } from "react";
import { Loader } from "@/components/loader";

type ForwardRequest = {
  id: string;
  note?: string | null;
  requestedAt: Date | string;
  suggestedHostIds: string[];
  visit: {
    id: string;
    purpose: string;
    visitor: { fullName: string; company?: string | null };
    department: { name: string };
    host: { name: string };
  };
  toDepartment: {
    id: string;
    name: string;
    employees: { id: string; name: string; designation?: string | null }[];
  };
};

export function ForwardRequests({ requests }: { requests: ForwardRequest[] }) {
  const [active, setActive] = useState<ForwardRequest | null>(null);
  const [hostId, setHostId] = useState("");
  const [priority, setPriority] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!requests.length && !active) return null;
  const suggested = active?.suggestedHostIds ?? [];
  async function assign(event: React.FormEvent) {
    event.preventDefault();
    if (!active) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/visit-forwards/${active.id}/assign`, {
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
    <section className="panel forward-request-panel">
      <div className="toolbar">
        <h2>Forwarding requests ({requests.length})</h2>
      </div>
      <div className="forward-request-list">
        {requests.map((request) => (
          <div className="forward-request" key={request.id}>
            <div>
              <strong>{request.visit.visitor.fullName}</strong>
              <p className="small">
                {request.visit.department.name} requested a handoff to {request.toDepartment.name} ·{" "}
                {request.visit.purpose}
              </p>
              {request.note && <p className="small">Note: {request.note}</p>}
            </div>
            <button
              className="primary"
              type="button"
              onClick={() => {
                setActive(request);
                setHostId("");
                setPriority("0");
                setError("");
              }}
            >
              Assign
            </button>
          </div>
        ))}
      </div>
      {active && (
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
                <p className="small">
                  {active.visit.visitor.fullName} → {active.toDepartment.name}
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setActive(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form className="reason-dialog-body" onSubmit={assign}>
              {error && <p className="error">{error}</p>}
              <label className="reason-field">
                <span>Host</span>
                <select
                  className="reason-select"
                  value={hostId}
                  onChange={(event) => setHostId(event.target.value)}
                  required
                >
                  <option value="">Select host</option>
                  {active.toDepartment.employees.map((host) => (
                    <option key={host.id} value={host.id}>
                      {suggested.includes(host.id) ? "Suggested · " : ""}
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
                  <option value="1">High</option>
                  <option value="2">Urgent</option>
                </select>
              </label>
              <div className="reason-actions">
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setActive(null)}
                  disabled={saving}
                >
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
    </section>
  );
}

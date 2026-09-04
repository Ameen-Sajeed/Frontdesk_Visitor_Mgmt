"use client";
import { useState } from "react";
import { VisitStatus } from "@prisma/client";

export function VisitActions({
  visitId,
  actions,
}: {
  visitId: string;
  actions: { status: VisitStatus; label: string; kind?: "danger" | "secondary" | "primary" }[];
}) {
  const [loading, setLoading] = useState(false);
  async function update(status: VisitStatus) {
    setLoading(true);
    try {
      const res = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="actions">
      {actions.map((action) => (
        <button
          key={action.status}
          className={action.kind ?? "secondary"}
          disabled={loading}
          onClick={() => update(action.status)}
        >
          {loading ? "Saving…" : action.label}
        </button>
      ))}
    </div>
  );
}

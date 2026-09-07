"use client";

import { useState } from "react";
import { Loader } from "@/components/loader";

export function NotifyDepartmentButton({ visitId }: { visitId: string }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function notify() {
    setSending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/visits/${visitId}/remind`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage("Department alerted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not alert the department.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="visitor-reminder">
      <button
        type="button"
        className="reminder-button"
        onClick={notify}
        disabled={sending}
        aria-label={message || "Alert department about this visitor"}
        data-tooltip={message || "Alert department"}
      >
        {sending ? <Loader label="Sending" /> : "🔔"}
      </button>
      {message && <span className="sr-only" role="status">{message}</span>}
    </div>
  );
}

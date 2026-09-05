"use client";

import { useState } from "react";

export function WaitThresholdSettings({ initialMinutes }: { initialMinutes: string }) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "wait_threshold_minutes", value: minutes }) });
      if (!response.ok) throw new Error((await response.json()).error);
      setMessage("Saved");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save."); }
    finally { setSaving(false); }
  }
  return <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
    <label className="small" htmlFor="wait-threshold">Wait alert</label>
    <input id="wait-threshold" className="filter" type="number" min="1" max="1440" value={minutes} onChange={(event) => setMinutes(event.target.value)} style={{ width: 72 }} />
    <span className="small">min</span>
    <button className="secondary" type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
    {message && <span className="small">{message}</span>}
  </div>;
}

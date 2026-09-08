"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { priorityOptions } from "@/lib/priority";

export function VisitPrioritySelect({
  visitId,
  priority,
  variant = "button",
}: {
  visitId: string;
  priority: number;
  variant?: "button" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function updatePriority(nextPriority: number) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: nextPriority }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update priority.");
      setOpen(false);
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update priority.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="priority-control">
      <button
        type="button"
        className={variant === "icon" ? "priority-icon-button" : "priority-change-button"}
        onClick={() => {
          setOpen((current) => !current);
          setError("");
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Change priority"
        data-tooltip="Change priority"
      >
        {variant === "icon" ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M13.5 6.5 17.5 10.5M4 20l4.2-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" />
          </svg>
        ) : (
          "Change priority"
        )}
      </button>
      {open && (
        <div className="priority-menu" role="menu" aria-label="Choose visitor priority">
          <p>Set priority</p>
          <div className="priority-menu-options">
            {priorityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`priority-menu-option priority-${option.label.toLowerCase()} ${
                  priority === option.value ? "selected" : ""
                }`}
                disabled={saving || priority === option.value}
                onClick={() => updatePriority(option.value)}
                role="menuitem"
              >
                {option.label}
              </button>
            ))}
          </div>
          {error && <span className="priority-error" role="alert">{error}</span>}
        </div>
      )}
    </div>
  );
}

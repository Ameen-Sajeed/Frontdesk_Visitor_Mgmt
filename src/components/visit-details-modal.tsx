"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { calculateMeetingDuration, calculateWaitingTime, formatDateTime } from "@/lib/timing";

interface VisitDetailsModalProps {
  visit: {
    id: string;
    purpose: string;
    type: string;
    status: string;
    registeredAt: Date | string;
    approvalAskedAt?: Date | string | null;
    decidedAt?: Date | string | null;
    checkedInAt?: Date | string | null;
    meetingStartedAt?: Date | string | null;
    checkedOutAt?: Date | string | null;
    leftAt?: Date | string | null;
    rejectionReason?: string | null;
    leftReason?: string | null;
    visitor: {
      fullName: string;
      phone: string;
      email?: string | null;
      company?: string | null;
      designation?: string | null;
    };
    department: { name: string };
    host: { name: string; designation?: string | null };
    history?: { id: string; status: string; createdAt: Date | string; note?: string | null }[];
  };
}

export function VisitDetailsModal({ visit }: VisitDetailsModalProps) {
  const [open, setOpen] = useState(false);

  const waitingTime = calculateWaitingTime(visit);
  const meetingDuration = calculateMeetingDuration(visit);

  return (
    <>
      <button
        type="button"
        className="secondary"
        onClick={() => setOpen(true)}
        style={{ padding: "4px 10px", fontSize: "0.75rem", borderRadius: 6 }}
      >
        Details
      </button>

      {open && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Visit details">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-head">
              <div>
                <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {visit.visitor.fullName} <StatusBadge status={visit.status as any} />
                </h2>
                <p className="small" style={{ marginTop: 2 }}>
                  {visit.visitor.designation ? `${visit.visitor.designation} · ` : ""}
                  {visit.visitor.company ? `${visit.visitor.company} · ` : ""}
                  {visit.visitor.phone}
                </p>
              </div>
              <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
            </div>

            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Overview Metrics Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: 12, borderRadius: 8, backgroundColor: "var(--panel-bg, #f8fafc)", border: "1px solid var(--border, #e2e8f0)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Waiting Time</div>
                  <strong style={{ fontSize: "1.125rem" }}>{waitingTime}</strong>
                </div>
                <div style={{ padding: 12, borderRadius: 8, backgroundColor: "var(--panel-bg, #f8fafc)", border: "1px solid var(--border, #e2e8f0)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Meeting Duration</div>
                  <strong style={{ fontSize: "1.125rem" }}>{meetingDuration}</strong>
                </div>
              </div>

              {/* Visit Metadata */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: "0.875rem" }}>
                <div>
                  <span style={{ color: "var(--muted, #64748b)" }}>Host: </span>
                  <strong>{visit.host.name}</strong> {visit.host.designation ? `(${visit.host.designation})` : ""}
                </div>
                <div>
                  <span style={{ color: "var(--muted, #64748b)" }}>Department: </span>
                  <strong>{visit.department.name}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted, #64748b)" }}>Visit Type: </span>
                  <strong>{visit.type === "WALK_IN" ? "Walk-in" : "Appointment"}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted, #64748b)" }}>Purpose: </span>
                  <strong>{visit.purpose}</strong>
                </div>
              </div>
              {(visit.rejectionReason || visit.leftReason) && <div style={{ fontSize: "0.875rem" }}><span style={{ color: "var(--muted, #64748b)" }}>{visit.rejectionReason ? "Rejection comment: " : "Left without meeting reason: "}</span><strong>{visit.rejectionReason || visit.leftReason}</strong></div>}

              {/* Visit Timeline */}
              <div>
                <h4 style={{ fontSize: "0.875rem", marginBottom: 10, color: "var(--muted, #64748b)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Visit Timeline
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, borderLeft: "2px solid var(--border, #cbd5e1)", paddingLeft: 12 }}>
                  <TimelineItem label="Registered at" time={visit.registeredAt} />
                  {visit.approvalAskedAt && <TimelineItem label="Approval requested" time={visit.approvalAskedAt} />}
                  {visit.decidedAt && <TimelineItem label={visit.status === "REJECTED" ? "Rejected at" : "Approved at"} time={visit.decidedAt} />}
                  {visit.checkedInAt && <TimelineItem label="Checked in at" time={visit.checkedInAt} />}
                  {visit.meetingStartedAt && <TimelineItem label="Meeting started at" time={visit.meetingStartedAt} />}
                  {visit.checkedOutAt && <TimelineItem label="Checked out at" time={visit.checkedOutAt} />}
                  {visit.leftAt && <TimelineItem label="Left without meeting at" time={visit.leftAt} />}
                </div>
              </div>
            </div>

            <div className="form-actions" style={{ padding: "12px 20px" }}>
              <button type="button" className="secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TimelineItem({ label, time }: { label: string; time?: Date | string | null }) {
  if (!time) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8125rem" }}>
      <span>{label}</span>
      <strong style={{ color: "var(--foreground, #1e293b)" }}>{formatDateTime(time)}</strong>
    </div>
  );
}

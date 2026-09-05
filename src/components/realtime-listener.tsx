"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { VisitStatus } from "@prisma/client";

interface RealtimeListenerProps {
  user?: {
    userId?: string;
    id?: string;
    role: string;
    departmentId?: string | null;
  } | null;
}

interface ToastNotification {
  id: string;
  type: "new_visitor" | "status_change" | "delayed";
  visit: {
    id: string;
    status: string;
    purpose: string;
    type: string;
    departmentId: string;
    visitor: { fullName: string; company?: string | null; phone: string };
    department: { name: string };
    host: { name: string };
  };
  message: string;
}

export function RealtimeListener({ user }: RealtimeListenerProps) {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const activeUserId = user.userId || user.id;

    const socket: Socket = io({
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      socket.emit("join", {
        userId: activeUserId,
        role: user.role,
        departmentId: user.departmentId,
      });
    });

    // 1. Reception -> Department: New visitor registered
    socket.on("new_visitor_registered", (visit) => {
      if (user.role === "DEPARTMENT_LEAD" && visit.departmentId === user.departmentId) {
        const toastId = `toast_${Date.now()}_${visit.id}`;
        setToasts((prev) => [
          {
            id: toastId,
            type: "new_visitor",
            visit,
            message: `New visitor waiting for approval: ${visit.visitor.fullName}`,
          },
          ...prev,
        ]);

        // Refresh dashboard data instantly without page reload
        router.refresh();
      }
    });

    // 2. Department -> Reception & Both Dashboards: Visit status updated
    socket.on("visit_status_changed", (visit) => {
      if (user.role === "RECEPTIONIST") {
        const statusLabel = visit.status === "APPROVED" ? "APPROVED" : visit.status === "REJECTED" ? "REJECTED" : visit.status.replaceAll("_", " ");
        const toastId = `toast_${Date.now()}_${visit.id}`;
        setToasts((prev) => [
          {
            id: toastId,
            type: "status_change",
            visit,
            message: `Visitor ${visit.visitor.fullName} was ${statusLabel} by ${visit.department?.name || "department"}.${visit.rejectionReason ? ` Reason: ${visit.rejectionReason}` : ""}`,
          },
          ...prev,
        ]);
      }

      // Auto refresh both dashboards in real time
      router.refresh();
    });

    socket.on("visit_delayed_alert", (alert) => {
      if (user.role !== "RECEPTIONIST") return;
      const toastId = `toast_${Date.now()}_${alert.visit.id}`;
      setToasts((prev) => [{ id: toastId, type: "delayed", visit: alert.visit, message: alert.message }, ...prev]);
      router.refresh();
    });

    return () => {
      socket.disconnect();
    };
  }, [user, router]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToastAction = async (toastId: string, visitId: string, status: VisitStatus) => {
    setActionLoading(visitId);
    try {
      const res = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(status === VisitStatus.REJECTED ? { rejectionReason: window.prompt("Rejection comment (optional):") || "" } : {}), ...(status === VisitStatus.LEFT_WITHOUT_MEETING ? { leftReason: window.prompt("Why did the visitor leave? (optional):") || "" } : {}) }),
      });
      if (!res.ok) throw new Error("Failed to update status.");
      removeToast(toastId);
      router.refresh();
    } catch {
      alert("Failed to update visitor status.");
    } finally {
      setActionLoading(null);
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 380,
        width: "100%",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            backgroundColor: "var(--card-bg, #ffffff)",
            border: "1px solid var(--border, #cbd5e1)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            animation: "slideIn 0.3s ease-out",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: toast.type === "new_visitor" ? "#3b82f6" : toast.type === "delayed" ? "#f59e0b" : "#10b981",
                  display: "inline-block",
                }}
              />
              <strong style={{ fontSize: "0.875rem" }}>
                {toast.type === "new_visitor" ? "New Visitor Waiting" : toast.type === "delayed" ? "Waiting too long" : "Visitor Status Updated"}
              </strong>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}
            >
              ×
            </button>
          </div>

          <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--foreground, #334155)", lineHeight: 1.4 }}>
            {toast.message}
          </p>

          <div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
            Meeting <strong>{toast.visit.host.name}</strong> ({toast.visit.department.name}) · {toast.visit.purpose}
          </div>

          {/* Quick Action Buttons directly inside Toast for Department Users */}
          {toast.type === "new_visitor" && user?.role === "DEPARTMENT_LEAD" && (
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                className="danger"
                disabled={actionLoading === toast.visit.id}
                onClick={() => handleToastAction(toast.id, toast.visit.id, VisitStatus.REJECTED)}
                style={{ flex: 1, padding: "6px 10px", fontSize: "0.8125rem", borderRadius: 6 }}
              >
                Reject
              </button>
              <button
                className="primary"
                disabled={actionLoading === toast.visit.id}
                onClick={() => handleToastAction(toast.id, toast.visit.id, VisitStatus.APPROVED)}
                style={{ flex: 1, padding: "6px 10px", fontSize: "0.8125rem", borderRadius: 6 }}
              >
                {actionLoading === toast.visit.id ? "Saving…" : "Approve"}
              </button>
            </div>
          )}
          {toast.type === "delayed" && user?.role === "RECEPTIONIST" && (
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button className="secondary" onClick={() => removeToast(toast.id)} style={{ flex: 1, padding: "6px 10px", fontSize: "0.8125rem", borderRadius: 6 }}>Continue waiting</button>
              <button className="danger" disabled={actionLoading === toast.visit.id} onClick={() => handleToastAction(toast.id, toast.visit.id, VisitStatus.LEFT_WITHOUT_MEETING)} style={{ flex: 1, padding: "6px 10px", fontSize: "0.8125rem", borderRadius: 6 }}>Mark left</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

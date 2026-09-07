"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { VisitStatus } from "@prisma/client";
import { VisitReasonModal } from "@/components/visit-reason-modal";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Loader } from "@/components/loader";

interface RealtimeListenerProps {
  user?: {
    userId?: string;
    id?: string;
    email?: string;
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
    host: { name: string; email?: string };
  };
  message: string;
  isReminder?: boolean;
}

export function RealtimeListener({ user }: RealtimeListenerProps) {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reasonAction, setReasonAction] = useState<{
    toastId: string;
    visitId: string;
    action: "REJECT" | "LEFT_WITHOUT_MEETING";
  } | null>(null);
  const [confirmation, setConfirmation] = useState<{
    toastId: string;
    visitId: string;
    action: "APPROVE" | "REJECT" | "LEFT_WITHOUT_MEETING";
    reason?: string;
  } | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!user) return;

    const socket: Socket = io({
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      window.dispatchEvent(new CustomEvent("arrivo:socket-presence", { detail: "online" }));
    });

    socket.on("disconnect", () => {
      window.dispatchEvent(new CustomEvent("arrivo:socket-presence", { detail: "offline" }));
    });

    const disconnectForLogout = () => socket.disconnect();
    window.addEventListener("arrivo:socket-logout", disconnectForLogout);

    socket.on("user_presence_changed", (presence) => {
      window.dispatchEvent(new CustomEvent("arrivo:host-presence", { detail: presence }));
    });

    socket.on("user_availability_changed", (availability) => {
      window.dispatchEvent(new CustomEvent("arrivo:host-availability", { detail: availability }));
    });

    // 1. Reception -> Department: New visitor registered
    socket.on("new_visitor_registered", (visit) => {
      if (
        user.role === "DEPARTMENT_LEAD" &&
        visit.departmentId === user.departmentId &&
        visit.host?.email?.toLowerCase() === user.email?.toLowerCase()
      ) {
        const toastId = `toast_${Date.now()}_${visit.id}`;
        setToasts((prev) => [
          {
            id: toastId,
            type: "new_visitor",
            visit,
            isReminder: Boolean(visit.isReminder),
            message: visit.isReminder
              ? `Reminder: ${visit.visitor.fullName} is still waiting for approval.`
              : `New visitor waiting for approval: ${visit.visitor.fullName}`,
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
        const statusLabel = visit.status.replaceAll("_", " ");
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

    socket.on("visit_forward_requested", (forwardRequest) => {
      if (user.role !== "RECEPTIONIST") return;
      const toastId = `toast_${Date.now()}_${forwardRequest.id}`;
      setToasts((prev) => [
        {
          id: toastId,
          type: "status_change",
          visit: forwardRequest.visit,
          message: `${forwardRequest.visit.visitor.fullName} was forwarded from ${forwardRequest.fromDepartmentName} to ${forwardRequest.toDepartmentName}. Assign a host and priority.`,
        },
        ...prev,
      ]);
      router.refresh();
    });

    socket.on("visit_delayed_alert", (alert) => {
      if (user.role !== "RECEPTIONIST") return;
      const toastId = `toast_${Date.now()}_${alert.visit.id}`;
      setToasts((prev) => [
        { id: toastId, type: "delayed", visit: alert.visit, message: alert.message },
        ...prev,
      ]);
      router.refresh();
    });

    return () => {
      window.removeEventListener("arrivo:socket-logout", disconnectForLogout);
      window.dispatchEvent(new CustomEvent("arrivo:socket-presence", { detail: "offline" }));
      socket.disconnect();
    };
  }, [user, router]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToastAction = async (
    toastId: string,
    visitId: string,
    action: "APPROVE" | "REJECT" | "LEFT_WITHOUT_MEETING",
    reason?: string,
  ) => {
    setActionLoading(visitId);
    setActionError("");
    try {
      const res = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "APPROVE" || action === "REJECT"
            ? { action, ...(action === "REJECT" ? { rejectionReason: reason } : {}) }
            : { status: action, leftReason: reason },
        ),
      });
      if (!res.ok) throw new Error("Failed to update status.");
      removeToast(toastId);
      router.refresh();
    } catch {
      setActionError("Could not update the visitor. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  if (toasts.length === 0 && !reasonAction && !confirmation) return null;

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
      {actionError && (
        <div className="realtime-feedback" role="status">
          {actionError}
        </div>
      )}
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
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor:
                    toast.type === "new_visitor"
                      ? "#3b82f6"
                      : toast.type === "delayed"
                        ? "#f59e0b"
                        : "#10b981",
                  display: "inline-block",
                }}
              />
              <strong style={{ fontSize: "0.875rem" }}>
                {toast.type === "new_visitor"
                  ? toast.isReminder
                    ? "Visitor Reminder"
                    : "New Visitor Waiting"
                  : toast.type === "delayed"
                    ? "Waiting too long"
                    : "Visitor Status Updated"}
              </strong>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#94a3b8",
                fontSize: 16,
              }}
            >
              ×
            </button>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: "0.8125rem",
              color: "var(--foreground, #334155)",
              lineHeight: 1.4,
            }}
          >
            {toast.message}
          </p>

          <div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
            Meeting <strong>{toast.visit.host.name}</strong> ({toast.visit.department.name}) ·{" "}
            {toast.visit.purpose}
          </div>
          {toast.type === "new_visitor" && (
            <div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
              Visitor: <strong>{toast.visit.visitor.fullName}</strong>
              {toast.visit.visitor.company ? ` · ${toast.visit.visitor.company}` : ""} ·{" "}
              {toast.visit.visitor.phone}
            </div>
          )}

          {/* Quick Action Buttons directly inside Toast for Department Users */}
          {toast.type === "new_visitor" && user?.role === "DEPARTMENT_LEAD" && (
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                className="danger"
                disabled={actionLoading === toast.visit.id}
                onClick={() =>
                  setReasonAction({
                    toastId: toast.id,
                    visitId: toast.visit.id,
                    action: "REJECT",
                  })
                }
                style={{ flex: 1, padding: "6px 10px", fontSize: "0.8125rem", borderRadius: 6 }}
              >
                {actionLoading === toast.visit.id ? <Loader label="Saving" /> : "Reject"}
              </button>
              <button
                className="primary"
                disabled={actionLoading === toast.visit.id}
                onClick={() =>
                  setConfirmation({
                    toastId: toast.id,
                    visitId: toast.visit.id,
                    action: "APPROVE",
                  })
                }
                style={{ flex: 1, padding: "6px 10px", fontSize: "0.8125rem", borderRadius: 6 }}
              >
                {actionLoading === toast.visit.id ? <Loader label="Saving" /> : "Approve"}
              </button>
            </div>
          )}
          {toast.type === "delayed" && user?.role === "RECEPTIONIST" && (
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                className="secondary"
                onClick={() => removeToast(toast.id)}
                style={{ flex: 1, padding: "6px 10px", fontSize: "0.8125rem", borderRadius: 6 }}
              >
                Continue waiting
              </button>
              <button
                className="danger"
                disabled={actionLoading === toast.visit.id}
                onClick={() =>
                  setReasonAction({
                    toastId: toast.id,
                    visitId: toast.visit.id,
                    action: VisitStatus.LEFT_WITHOUT_MEETING,
                  })
                }
                style={{ flex: 1, padding: "6px 10px", fontSize: "0.8125rem", borderRadius: 6 }}
              >
                {actionLoading === toast.visit.id ? <Loader label="Saving" /> : "Mark left"}
              </button>
            </div>
          )}
        </div>
      ))}
      {reasonAction && (
        <VisitReasonModal
          action={reasonAction.action}
          visitId={reasonAction.visitId}
          loading={actionLoading === reasonAction.visitId}
          onCancel={() => setReasonAction(null)}
          onSubmit={(reason) => {
            setConfirmation({ ...reasonAction, reason });
            setReasonAction(null);
          }}
        />
      )}
      {confirmation && (
        <ConfirmActionDialog
          title={
            confirmation.action === "APPROVE"
              ? "Approve visitor?"
              : confirmation.action === "REJECT"
                ? "Reject visitor?"
                : "Mark visitor as left?"
          }
          message={
            confirmation.action === "APPROVE"
              ? "Reception will be notified that this visitor is approved."
              : "This visitor's status will be updated."
          }
          confirmLabel={
            confirmation.action === "APPROVE"
              ? "Approve"
              : confirmation.action === "REJECT"
                ? "Reject"
                : "Mark left"
          }
          danger={confirmation.action !== "APPROVE"}
          loading={actionLoading === confirmation.visitId}
          onCancel={() => setConfirmation(null)}
          onConfirm={async () => {
            await handleToastAction(
              confirmation.toastId,
              confirmation.visitId,
              confirmation.action,
              confirmation.reason,
            );
            setConfirmation(null);
          }}
        />
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

interface DepartmentTabsProps {
  activeTab: "pending" | "history";
  pendingCount: number;
}

export function DepartmentTabs({ activeTab, pendingCount }: DepartmentTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createTabUrl = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.delete("page");
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderBottom: "1px solid var(--border, #e2e8f0)",
        marginBottom: 16,
      }}
    >
      <Link
        href={createTabUrl("pending")}
        style={{
          padding: "10px 16px",
          fontSize: "0.875rem",
          fontWeight: 600,
          textDecoration: "none",
          color: activeTab === "pending" ? "var(--primary, #2563eb)" : "var(--muted, #64748b)",
          borderBottom: activeTab === "pending" ? "2px solid var(--primary, #2563eb)" : "2px solid transparent",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>Pending Visitors</span>
        {pendingCount > 0 && (
          <span
            style={{
              backgroundColor: activeTab === "pending" ? "var(--primary, #2563eb)" : "#94a3b8",
              color: "#ffffff",
              fontSize: "0.75rem",
              padding: "2px 7px",
              borderRadius: 10,
              fontWeight: 500,
            }}
          >
            {pendingCount}
          </span>
        )}
      </Link>

      <Link
        href={createTabUrl("history")}
        style={{
          padding: "10px 16px",
          fontSize: "0.875rem",
          fontWeight: 600,
          textDecoration: "none",
          color: activeTab === "history" ? "var(--primary, #2563eb)" : "var(--muted, #64748b)",
          borderBottom: activeTab === "history" ? "2px solid var(--primary, #2563eb)" : "2px solid transparent",
        }}
      >
        Visitor History
      </Link>
    </div>
  );
}

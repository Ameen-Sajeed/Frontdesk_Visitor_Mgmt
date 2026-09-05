"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useTableNavigation } from "@/components/table-navigation";

interface DateFilterProps {
  value?: string;
  name?: string;
}

export function DateFilter({ value = "ALL", name = "dateRange" }: DateFilterProps) {
  const { navigate } = useTableNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const options = [
    { value: "ALL", label: "All time" },
    { value: "30DAYS", label: "Last 30 Days" },
    { value: "CUSTOM", label: "Custom range" },
  ];

  const handleChange = (newValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newValue === "ALL") {
      params.delete(name);
    } else {
      params.set(name, newValue);
    }
    params.delete("page"); // Reset to page 1 on filter change
    navigate(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      <select
      className="filter-select"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      style={{
        padding: "6px 12px",
        borderRadius: 8,
        border: "1px solid var(--border, #cbd5e1)",
        backgroundColor: "var(--card-bg, #ffffff)",
        fontSize: "0.875rem",
        color: "inherit",
        cursor: "pointer",
      }}
      >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
      </select>
      {value === "CUSTOM" && <CustomRange />}
    </>
  );
}

function CustomRange() {
  const { navigate } = useTableNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const update = (name: "startDate" | "endDate", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value); else params.delete(name);
    params.delete("page");
    navigate(`${pathname}?${params.toString()}`);
  };
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <input aria-label="From date" className="filter-select" type="date" value={searchParams.get("startDate") ?? ""} onChange={(event) => update("startDate", event.target.value)} />
      <input aria-label="To date" className="filter-select" type="date" value={searchParams.get("endDate") ?? ""} onChange={(event) => update("endDate", event.target.value)} />
    </span>
  );
}

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface DateFilterProps {
  value?: string;
  name?: string;
}

export function DateFilter({ value = "ALL", name = "dateRange" }: DateFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const options = [
    { value: "ALL", label: "All time" },
    { value: "TODAY", label: "Today" },
    { value: "YESTERDAY", label: "Yesterday" },
    { value: "7DAYS", label: "Last 7 Days" },
    { value: "30DAYS", label: "Last 30 Days" },
  ];

  const handleChange = (newValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newValue === "ALL") {
      params.delete(name);
    } else {
      params.set(name, newValue);
    }
    params.delete("page"); // Reset to page 1 on filter change
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
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
  );
}

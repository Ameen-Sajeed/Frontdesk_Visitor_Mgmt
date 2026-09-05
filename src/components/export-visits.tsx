"use client";

import { useSearchParams } from "next/navigation";

export function ExportVisits() {
  const searchParams = useSearchParams();
  const download = (format: "excel" | "pdf") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("format", format);
    window.location.assign(`/api/export?${params.toString()}`);
  };
  return (
    <div className="actions">
      <button type="button" className="secondary" onClick={() => download("excel")}>Export Excel</button>
      <button type="button" className="secondary" onClick={() => download("pdf")}>Export PDF</button>
    </div>
  );
}

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
    <div className="actions export-actions" aria-label="Export visitor list">
      <button
        type="button"
        className="secondary export-button"
        onClick={() => download("excel")}
        aria-label="Export visitor list as Excel"
        title="Excel Export"
        data-tooltip="Excel Export"
      >
        <SpreadsheetIcon />
        <span className="sr-only">Excel Export</span>
      </button>
      <button
        type="button"
        className="secondary export-button"
        onClick={() => download("pdf")}
        aria-label="Export visitor list as PDF"
        title="PDF Export"
        data-tooltip="PDF Export"
      >
        <PdfIcon />
        <span className="sr-only">PDF Export</span>
      </button>
    </div>
  );
}

function SpreadsheetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 3.75h10.5L20 8.25v12H5z" />
      <path d="M15.5 3.75v4.5H20M8 12h8M8 15h8M11 9v9M15 9v9" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 3.75h10.5L20 8.25v12H5z" />
      <path d="M15.5 3.75v4.5H20M8 16.5h8M8 13.5h5.5" />
    </svg>
  );
}

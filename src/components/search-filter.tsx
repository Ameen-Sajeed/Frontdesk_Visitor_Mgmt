"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTableNavigation } from "@/components/table-navigation";

export function SearchFilter({ defaultValue = "" }: { defaultValue?: string }) {
  const { navigate } = useTableNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(defaultValue);

  useEffect(() => {
    setSearchTerm(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextSearch = searchTerm.trim();
      const currentSearch = searchParams.get("search") ?? "";
      // SearchParams also changes during pagination. Only reset the page when
      // the search value itself has changed.
      if (nextSearch === currentSearch) return;

      const params = new URLSearchParams(searchParams.toString());
      if (nextSearch) {
        params.set("search", nextSearch);
      } else {
        params.delete("search");
      }
      params.delete("page");
      navigate(`${pathname}?${params.toString()}`);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm, pathname, navigate, searchParams]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <input
        type="text"
        placeholder="Search visitor, company, phone…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          padding: "6px 12px",
          paddingRight: "28px",
          borderRadius: 8,
          border: "1px solid var(--border, #cbd5e1)",
          fontSize: "0.875rem",
          minWidth: 220,
        }}
      />
      {searchTerm && (
        <button
          type="button"
          onClick={() => setSearchTerm("")}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "#94a3b8",
            fontSize: 14,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

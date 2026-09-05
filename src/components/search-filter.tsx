"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function SearchFilter({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(defaultValue);

  useEffect(() => {
    setSearchTerm(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim());
      } else {
        params.delete("search");
      }
      params.delete("page");
      if (params.toString() !== searchParams.toString()) {
        router.push(`${pathname}?${params.toString()}`);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm, pathname, router, searchParams]);

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

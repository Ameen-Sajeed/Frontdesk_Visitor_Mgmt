"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
}

export function Pagination({ page, totalPages, totalCount }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  if (totalPages <= 1) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderTop: "1px solid var(--border, #e2e8f0)",
        fontSize: "0.875rem",
        color: "var(--muted, #64748b)",
      }}
    >
      <div>
        Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total)
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          className="secondary"
          disabled={page <= 1}
          onClick={() => handlePageChange(page - 1)}
          style={{ padding: "6px 12px", fontSize: "0.8125rem", borderRadius: 6 }}
        >
          Previous
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
          // Show current page, first, last, and immediate neighbors
          if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
            return (
              <button
                key={p}
                type="button"
                className={p === page ? "primary" : "secondary"}
                onClick={() => handlePageChange(p)}
                style={{
                  padding: "6px 10px",
                  fontSize: "0.8125rem",
                  borderRadius: 6,
                  minWidth: 32,
                }}
              >
                {p}
              </button>
            );
          }
          if (p === 2 && page > 3) {
            return <span key="dots-1">…</span>;
          }
          if (p === totalPages - 1 && page < totalPages - 2) {
            return <span key="dots-2">…</span>;
          }
          return null;
        })}

        <button
          type="button"
          className="secondary"
          disabled={page >= totalPages}
          onClick={() => handlePageChange(page + 1)}
          style={{ padding: "6px 12px", fontSize: "0.8125rem", borderRadius: 6 }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

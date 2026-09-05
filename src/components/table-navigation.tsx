"use client";

import { createContext, useCallback, useContext, useMemo, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "@/components/loader";

const TableNavigationContext = createContext<{
  isPending: boolean;
  navigate: (url: string) => void;
  refresh: () => void;
} | null>(null);

export function TableNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback((url: string) => startTransition(() => router.push(url)), [router]);
  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);
  const value = useMemo(() => ({ isPending, navigate, refresh }), [isPending, navigate, refresh]);

  return <TableNavigationContext.Provider value={value}>{children}</TableNavigationContext.Provider>;
}

export function useTableNavigation() {
  const context = useContext(TableNavigationContext);
  if (!context) throw new Error("useTableNavigation must be used within TableNavigationProvider.");
  return context;
}

export function TableLoadingIndicator() {
  const { isPending } = useTableNavigation();
  if (!isPending) return null;
  return (
    <div className="table-loading" role="status" aria-live="polite">
      <Loader label="Updating visitor list" />
    </div>
  );
}

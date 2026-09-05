"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

export function QueryFilter({
  name,
  value,
  options,
}: {
  name: string;
  value?: string;
  options: Option[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextValue === "ALL") params.delete(name); else params.set(name, nextValue);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select className="filter" value={value ?? ""} onChange={(event) => update(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

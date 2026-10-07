"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SortSelect({
  value,
  label,
  options,
}: {
  value: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          if (e.target.value === "newest") next.delete("sort");
          else next.set("sort", e.target.value);
          const s = next.toString();
          router.replace(`${pathname}${s ? `?${s}` : ""}`, { scroll: false });
        }}
        className="rounded-full border border-line bg-surface px-3 py-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

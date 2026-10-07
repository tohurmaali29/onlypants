"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = { id: number; message: string; tone: "success" | "error" };
let toasts: Toast[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

export function toast(message: string, tone: Toast["tone"] = "success") {
  const id = nextId++;
  toasts = [...toasts, { id, message, tone }];
  listeners.forEach((l) => l());
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((l) => l());
  }, 3500);
}

const empty: Toast[] = [];

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => toasts,
    () => empty,
  );
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4"
    >
      {list.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-center gap-2 rounded-full border bg-surface-2 px-4 py-2.5 text-sm shadow-lg shadow-black/40",
            t.tone === "success" ? "border-success/40" : "border-danger/50",
          )}
        >
          {t.tone === "success" ? (
            <CheckCircle2 className="size-4 text-success" aria-hidden />
          ) : (
            <AlertCircle className="size-4 text-danger" aria-hidden />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}

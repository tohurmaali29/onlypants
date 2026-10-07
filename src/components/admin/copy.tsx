"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButtonAdmin({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs hover:border-accent"
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      {copied ? "Tersalin" : label}
    </button>
  );
}

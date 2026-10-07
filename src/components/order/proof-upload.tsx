"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { confirmProofUpload, createProofUpload } from "@/lib/actions/order";

const MAX = 5 * 1024 * 1024;

export function ProofUpload({ code, accessKey }: { code: string; accessKey: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!file) return inputRef.current?.click();
    if (file.size > MAX) return setError(t.order.uploadHint);
    setError(null);
    start(async () => {
      const ticket = await createProofUpload({ code, key: accessKey, type: file.type, size: file.size });
      if (!ticket.ok) return setError(ticket.error === "file" ? t.order.uploadHint : t.checkout.errors.generic);

      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (upErr) return setError(t.checkout.errors.generic);

      const done = await confirmProofUpload({ code, key: accessKey, path: ticket.path });
      if (!done.ok) return setError(t.checkout.errors.generic);
      toast(t.order.uploaded);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <label
        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-surface-2/50 px-4 py-6 text-center hover:border-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
      >
        <FileUp className="size-6 text-accent" aria-hidden />
        <span className="text-sm font-medium">{file ? file.name : t.order.uploadTitle}</span>
        <span className="text-xs text-muted">{t.order.uploadHint}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError(null);
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button onClick={submit} disabled={pending} size="lg" className="w-full">
        {pending ? (
          <>
            <Loader2 className="size-5 animate-spin" /> {t.order.uploading}
          </>
        ) : (
          t.order.uploadCta
        )}
      </Button>
    </div>
  );
}

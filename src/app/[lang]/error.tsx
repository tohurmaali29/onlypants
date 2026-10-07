"use client";

import { useEffect } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => console.error(error), [error]);
  return (
    <div className="container-page flex min-h-[50svh] flex-col items-center justify-center py-20 text-center">
      <h1 className="font-display text-2xl uppercase">{t.common.error}</h1>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted">{error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        {t.common.retry}
      </Button>
    </div>
  );
}

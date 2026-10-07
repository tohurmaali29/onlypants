"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { trackOrder } from "@/lib/actions/order";

export function TrackForm({ defaultCode }: { defaultCode?: string }) {
  const { locale, t } = useI18n();
  const [state, action, pending] = useActionState(trackOrder, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label htmlFor="code" className="mb-1.5 block text-sm font-medium">
          {t.track.code}
        </label>
        <input id="code" name="code" required defaultValue={defaultCode} placeholder="OP-261007-XXXX" className="input-field uppercase" autoCapitalize="characters" />
      </div>
      <div>
        <label htmlFor="contact" className="mb-1.5 block text-sm font-medium">
          {t.track.contact}
        </label>
        <input id="contact" name="contact" required className="input-field" autoComplete="email" />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error === "rateLimit" ? t.checkout.errors.rateLimit : t.track.notFound}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-5 animate-spin" />} {t.track.submit}
      </Button>
    </form>
  );
}

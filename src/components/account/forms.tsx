"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { CheckCircle2, Loader2, MapPin, Pencil, Star, Trash2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  deleteAddressAction,
  forgotPasswordAction,
  saveAddressAction,
  saveProfileAction,
  setDefaultAddressAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
} from "@/lib/actions/account";
import { cn } from "@/lib/utils";

type State = { ok: true; message?: string } | { ok: false; error: string; fields?: string[]; values?: Record<string, string> } | null;

/** Value typed before a failed submit, falling back to the original. */
const kept = (s: State, name: string, fallback?: string) => (s && !s.ok ? (s.values?.[name] ?? fallback) : fallback);

function useMessages() {
  const { t } = useI18n();
  return {
    error: (s: State) => (s && !s.ok ? ((t.auth.errors as Record<string, string>)[s.error] ?? t.auth.errors.generic) : null),
    message: (s: State) => (s?.ok && s.message ? ((t.auth.messages as Record<string, string>)[s.message] ?? null) : null),
    invalid: (s: State, f: string) => !!(s && !s.ok && s.fields?.includes(f)),
  };
}

function Feedback({ state }: { state: State }) {
  const m = useMessages();
  const err = m.error(state);
  const msg = m.message(state);
  if (err)
    return (
      <p role="alert" className="text-sm text-danger">
        {err}
      </p>
    );
  if (msg)
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-success">
        <CheckCircle2 className="size-4" /> {msg}
      </p>
    );
  return null;
}

function Input({
  label,
  name,
  invalid,
  hint,
  idPrefix = "a",
  ...props
}: React.ComponentProps<"input"> & { label: string; name: string; invalid?: boolean; hint?: string; idPrefix?: string }) {
  const id = `${idPrefix}-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input id={id} name={name} aria-invalid={invalid} className="input-field" {...props} />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Submit({ pending, children, className }: { pending: boolean; children: React.ReactNode; className?: string }) {
  return (
    <Button type="submit" size="lg" disabled={pending} className={className}>
      {pending && <Loader2 className="size-4 animate-spin" />} {children}
    </Button>
  );
}

// ------------------------------------------------------------------ sign in / up

export function AuthForms({ next, initialTab = "signin" }: { next?: string; initialTab?: "signin" | "signup" }) {
  const { locale, t } = useI18n();
  const [tab, setTab] = useState(initialTab);
  const [inState, signIn, inPending] = useActionState(signInAction, null);
  const [upState, signUp, upPending] = useActionState(signUpAction, null);
  const m = useMessages();

  return (
    <div>
      <div role="tablist" className="mb-6 grid grid-cols-2 rounded-full border border-line p-1 text-sm font-semibold">
        {(["signin", "signup"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn("rounded-full py-2", tab === k ? "bg-primary text-white" : "text-muted hover:text-fg")}
          >
            {k === "signin" ? t.auth.signIn : t.auth.signUp}
          </button>
        ))}
      </div>

      {tab === "signin" ? (
        <form action={signIn} className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          {next && <input type="hidden" name="next" value={next} />}
          <Input label={t.auth.email} name="email" type="email" autoComplete="email" required defaultValue={kept(inState, "email")} key={`in-${JSON.stringify(inState)}`} />
          <Input label={t.auth.password} name="password" type="password" autoComplete="current-password" required />
          <div className="text-right text-sm">
            <Link href={`/${locale}/forgot`} className="text-accent hover:underline">
              {t.auth.forgot}
            </Link>
          </div>
          <Feedback state={inState} />
          <Submit pending={inPending} className="w-full">
            {t.auth.signIn}
          </Submit>
          <p className="text-center text-xs text-muted">{t.auth.staffNote}</p>
        </form>
      ) : (
        <form action={signUp} className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          {next && <input type="hidden" name="next" value={next} />}
          <Input label={t.auth.name} name="name" autoComplete="name" required minLength={2} invalid={m.invalid(upState, "name")} defaultValue={kept(upState, "name")} key={`n-${JSON.stringify(upState)}`} />
          <Input label={t.auth.email} name="email" type="email" autoComplete="email" required invalid={m.invalid(upState, "email")} defaultValue={kept(upState, "email")} key={`e-${JSON.stringify(upState)}`} />
          <Input label={t.auth.phone} name="phone" type="tel" autoComplete="tel" required hint={t.checkout.phoneHint} invalid={m.invalid(upState, "phone")} defaultValue={kept(upState, "phone")} key={`p-${JSON.stringify(upState)}`} />
          <Input
            label={t.auth.password}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            hint={t.auth.passwordHint}
            invalid={m.invalid(upState, "password")}
          />
          <Feedback state={upState} />
          <Submit pending={upPending} className="w-full">
            {t.auth.signUp}
          </Submit>
        </form>
      )}
    </div>
  );
}

export function ForgotForm() {
  const { locale, t } = useI18n();
  const [state, action, pending] = useActionState(forgotPasswordAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <Input label={t.auth.email} name="email" type="email" autoComplete="email" required defaultValue={kept(state, "email")} key={JSON.stringify(state)} />
      <Feedback state={state} />
      <Submit pending={pending} className="w-full">
        {t.auth.sendLink}
      </Submit>
    </form>
  );
}

export function PasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updatePasswordAction, null);
  return (
    <form action={action} className="space-y-4">
      <Input label={t.auth.password} name="password" type="password" autoComplete="new-password" required minLength={8} hint={t.auth.passwordHint} />
      <Feedback state={state} />
      <Submit pending={pending}>{t.auth.savePassword}</Submit>
    </form>
  );
}

// ------------------------------------------------------------------ profile & addresses

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(saveProfileAction, null);
  const m = useMessages();
  return (
    <form action={action} className="space-y-4">
      <Input label={t.auth.email} name="email_display" value={email} disabled readOnly />
      <Input label={t.auth.name} name="name" defaultValue={kept(state, "name", name)} key={`pn-${JSON.stringify(state)}`} required invalid={m.invalid(state, "name")} />
      <Input label={t.auth.phone} name="phone" type="tel" defaultValue={kept(state, "phone", phone)} key={`pp-${JSON.stringify(state)}`} required invalid={m.invalid(state, "phone")} />
      <Feedback state={state} />
      <Submit pending={pending}>{t.account.save}</Submit>
    </form>
  );
}

export type SavedAddress = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  line: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
};

function AddressForm({ address, onDone }: { address?: SavedAddress; onDone: () => void }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(async (prev: State, fd: FormData) => {
    const r = await saveAddressAction(prev, fd);
    if (r?.ok) onDone();
    return r;
  }, null);
  const m = useMessages();
  const a = address;
  return (
    <form key={JSON.stringify(state)} action={action} className="grid gap-3 rounded-xl border border-line bg-surface-2/40 p-4 sm:grid-cols-2">
      {a && <input type="hidden" name="id" value={a.id} />}
      <Input idPrefix="addr" label={t.account.label} name="label" defaultValue={kept(state, "label", a?.label)} />
      <Input idPrefix="addr" label={t.account.recipient} name="recipient" defaultValue={kept(state, "recipient", a?.recipient)} required invalid={m.invalid(state, "recipient")} />
      <Input idPrefix="addr" label={t.auth.phone} name="phone" type="tel" defaultValue={kept(state, "phone", a?.phone)} required invalid={m.invalid(state, "phone")} />
      <Input idPrefix="addr" label={t.checkout.postalCode} name="postalCode" inputMode="numeric" maxLength={5} defaultValue={kept(state, "postalCode", a?.postalCode)} required invalid={m.invalid(state, "postalCode")} />
      <div className="sm:col-span-2">
        <Input idPrefix="addr" label={t.checkout.address} name="line" defaultValue={kept(state, "line", a?.line)} required invalid={m.invalid(state, "line")} />
      </div>
      <Input idPrefix="addr" label={t.checkout.district} name="district" defaultValue={kept(state, "district", a?.district)} required invalid={m.invalid(state, "district")} />
      <Input idPrefix="addr" label={t.checkout.city} name="city" defaultValue={kept(state, "city", a?.city)} required invalid={m.invalid(state, "city")} />
      <Input idPrefix="addr" label={t.checkout.province} name="province" defaultValue={kept(state, "province", a?.province)} required invalid={m.invalid(state, "province")} />
      <label className="flex items-center gap-2 self-end text-sm">
        <input type="checkbox" name="isDefault" defaultChecked={a?.isDefault} className="size-4" /> {t.account.makeDefault}
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Submit pending={pending}>{t.account.save}</Submit>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t.account.cancel}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function AddressManager({ addresses }: { addresses: SavedAddress[] }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      {addresses.length === 0 && editing !== "new" && <p className="text-sm text-muted">{t.account.noAddresses}</p>}
      {addresses.map((a) =>
        editing === a.id ? (
          <AddressForm key={a.id} address={a} onDone={() => setEditing(null)} />
        ) : (
          <div key={a.id} className="flex gap-3 rounded-xl border border-line p-4 text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {a.label || a.recipient}
                {a.isDefault && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[11px] text-white">{t.account.default}</span>}
              </p>
              <p className="text-muted">
                {a.recipient} · {a.phone}
              </p>
              <p className="text-muted">
                {a.line}, {a.district}, {a.city}, {a.province} {a.postalCode}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <button onClick={() => setEditing(a.id)} className="inline-flex items-center gap-1 text-accent hover:underline">
                  <Pencil className="size-3.5" /> {t.account.edit}
                </button>
                {!a.isDefault && (
                  <button disabled={pending} onClick={() => start(() => setDefaultAddressAction(a.id))} className="inline-flex items-center gap-1 text-muted hover:text-fg">
                    <Star className="size-3.5" /> {t.account.makeDefault}
                  </button>
                )}
                <button
                  disabled={pending}
                  onClick={() => confirm(t.account.delete + "?") && start(() => deleteAddressAction(a.id))}
                  className="inline-flex items-center gap-1 text-muted hover:text-danger"
                >
                  <Trash2 className="size-3.5" /> {t.account.delete}
                </button>
              </div>
            </div>
          </div>
        ),
      )}
      {editing === "new" ? (
        <AddressForm onDone={() => setEditing(null)} />
      ) : (
        <Button variant="secondary" onClick={() => setEditing("new")}>
          {t.account.addAddress}
        </Button>
      )}
    </div>
  );
}

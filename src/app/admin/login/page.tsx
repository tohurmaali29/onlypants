import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/site/header";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:p-8">
        <Logo className="text-2xl" />
        <h1 className="mt-6 text-xl font-semibold">Masuk ke dashboard</h1>
        <p className="mt-1 mb-6 text-sm text-muted">Khusus owner dan staff OnlyPants.</p>
        <LoginForm />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { SettingsForms } from "@/components/admin/settings-forms";
import { PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

// Reads the session on every request (see (panel)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  await requireStaff("owner");
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Pengaturan" />
      <SettingsForms settings={settings} />
    </>
  );
}

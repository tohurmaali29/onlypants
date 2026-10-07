"use client";

import { useState, useTransition } from "react";
import { Card, Field } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { addStaffAction, changeOwnPasswordAction, resetStaffPasswordAction, updateStaffAction } from "@/lib/actions/admin-staff";

type S = { id: string; name: string; email: string; role: "owner" | "staff"; active: boolean };

export function StaffManager({ staff, meId }: { staff: S[]; meId: string }) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ name: "", email: "", role: "staff" as S["role"] });
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
  const [myPassword, setMyPassword] = useState("");

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs text-muted uppercase">
            <tr>
              <th className="px-5 py-3 font-medium">Nama</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {staff.map((s) => {
              const me = s.id === meId;
              return (
                <tr key={s.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium">
                      {s.name} {me && <span className="text-xs text-muted">(kamu)</span>}
                    </p>
                    <p className="text-xs text-muted">{s.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={s.role}
                      disabled={me || pending}
                      onChange={(e) => start(async () => {
                        const r = await updateStaffAction(s.id, { role: e.target.value as S["role"] });
                        if (!r.ok) toast(r.error, "error");
                      })}
                      className="rounded-lg border border-line bg-surface px-2 py-1"
                      aria-label={`Role ${s.name}`}
                    >
                      <option value="staff">Staff</option>
                      <option value="owner">Owner</option>
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <span className={s.active ? "text-success" : "text-muted"}>{s.active ? "Aktif" : "Nonaktif"}</span>
                  </td>
                  <td className="space-x-2 px-5 py-3 text-right whitespace-nowrap">
                    {!me && (
                      <>
                        <button
                          className="text-xs text-accent hover:underline"
                          disabled={pending}
                          onClick={() => confirm(`Reset password ${s.name}?`) && start(async () => {
                            const r = await resetStaffPasswordAction(s.id);
                            if (r.ok && r.password) setSecret({ email: s.email, password: r.password });
                            else if (!r.ok) toast(r.error, "error");
                          })}
                        >
                          Reset password
                        </button>
                        <button
                          className="text-xs text-muted hover:text-fg"
                          disabled={pending}
                          onClick={() => start(async () => {
                            const r = await updateStaffAction(s.id, { active: !s.active });
                            if (!r.ok) toast(r.error, "error");
                          })}
                        >
                          {s.active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div className="space-y-6">
        {secret && (
          <Card className="border-success">
            <h2 className="mb-2 font-semibold">Password sementara</h2>
            <p className="text-sm text-muted">Kirim ke {secret.email}. Hanya ditampilkan sekali.</p>
            <p className="mt-3 rounded-lg bg-surface-2 p-3 font-mono text-lg select-all">{secret.password}</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => setSecret(null)}>
              Sudah dicatat
            </Button>
          </Card>
        )}
        <Card>
          <h2 className="mb-4 font-semibold">Tambah akun</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await addStaffAction(form);
                if (r.ok && r.password) {
                  setSecret({ email: form.email, password: r.password });
                  setForm({ name: "", email: "", role: "staff" });
                } else if (!r.ok) toast(r.error, "error");
              });
            }}
          >
            <Field label="Nama">
              <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Email">
              <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label="Role" hint="Staff: produk, stok, pesanan. Owner: semua termasuk laporan, pengaturan, staff.">
              <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as S["role"] })}>
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </select>
            </Field>
            <Button type="submit" disabled={pending}>
              Buat akun
            </Button>
          </form>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Ganti password saya</h2>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await changeOwnPasswordAction(myPassword);
                if (r.ok) {
                  toast("Password diganti");
                  setMyPassword("");
                } else toast(r.error, "error");
              });
            }}
          >
            <input type="password" autoComplete="new-password" minLength={10} className="input-field flex-1" value={myPassword} onChange={(e) => setMyPassword(e.target.value)} placeholder="Min. 10 karakter" aria-label="Password baru" />
            <Button type="submit" variant="secondary" disabled={pending}>
              Simpan
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

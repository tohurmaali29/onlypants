import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { normalizePhone } from "@/lib/format";

// Not a "use server" module on purpose: saveAddress takes a userId and must only
// be called with the signed-in user's id from a server action.

export const addressSchema = z.object({
  id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  label: z.string().trim().max(30).default(""),
  recipient: z.string().trim().min(2).max(100),
  phone: z.string().transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) ctx.addIssue({ code: "custom", message: "phone" });
    return n ?? "";
  }),
  line: z.string().trim().min(5).max(300),
  district: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  postalCode: z.string().regex(/^\d{5}$/),
  isDefault: z.string().optional().transform((v) => v === "on" || v === "true"),
});
export type AddressInput = z.input<typeof addressSchema>;

/** Upsert an address. The first address, or one marked default, becomes the default. */
export async function saveAddress(userId: string, input: Omit<z.output<typeof addressSchema>, "id"> & { id?: string }) {
  return db.transaction(async (tx) => {
    const existing = await tx.select({ id: schema.customerAddresses.id }).from(schema.customerAddresses).where(eq(schema.customerAddresses.userId, userId));
    const makeDefault = input.isDefault || existing.length === 0 || (existing.length === 1 && existing[0].id === input.id);
    if (makeDefault) await tx.update(schema.customerAddresses).set({ isDefault: false }).where(eq(schema.customerAddresses.userId, userId));
    const values = { ...input, userId, isDefault: makeDefault };
    if (input.id) {
      const { id, ...rest } = values;
      await tx.update(schema.customerAddresses).set(rest).where(and(eq(schema.customerAddresses.id, id!), eq(schema.customerAddresses.userId, userId)));
    } else {
      const { id: _drop, ...rest } = values;
      void _drop;
      await tx.insert(schema.customerAddresses).values(rest);
    }
  });
}


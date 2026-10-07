import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { FulfillmentStep } from "@/lib/db/schema";

/** Attach short-lived signed URLs to each step's private photos. */
export async function withPhotoUrls(steps: FulfillmentStep[], ttlSeconds = 3600) {
  const paths = steps.flatMap((s) => s.photos);
  if (paths.length === 0) return steps.map((s) => ({ ...s, photoUrls: [] as string[] }));
  const { data } = await createServiceClient().storage.from("fulfillment-photos").createSignedUrls(paths, ttlSeconds);
  const url = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return steps.map((s) => ({ ...s, photoUrls: s.photos.map((p) => url.get(p)).filter((u): u is string => !!u) }));
}

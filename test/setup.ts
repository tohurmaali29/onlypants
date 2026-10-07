import { config } from "dotenv";
import { vi } from "vitest";

config({ path: ".env.local", quiet: true });

// "use cache" helpers are no-ops outside the Next.js runtime.
vi.mock("next/cache", () => ({
  cacheLife: () => {},
  cacheTag: () => {},
  updateTag: () => {},
  revalidateTag: () => {},
}));

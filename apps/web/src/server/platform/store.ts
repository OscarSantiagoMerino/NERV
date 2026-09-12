import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { StoreSchema, type Store } from "@/contracts/schemas";
import { seedStore } from "@/contracts/fixture";

// Cut-scope MVP replaces Postgres/Supabase with a single JSON file (see
// docs/context/mvp-revisado-110min.md). One writer (the Next.js dev server
// process) at a time; the in-process queue below serializes writes so two
// near-simultaneous requests don't clobber each other's read-modify-write.

const STORE_PATH = join(process.cwd(), ".data", "nerv-store.json");

let writeQueue: Promise<unknown> = Promise.resolve();

async function ensureFile(): Promise<void> {
  try {
    await readFile(STORE_PATH, "utf-8");
  } catch {
    await mkdir(dirname(STORE_PATH), { recursive: true });
    await writeFile(STORE_PATH, JSON.stringify(seedStore, null, 2), "utf-8");
  }
}

export async function loadStore(): Promise<Store> {
  await ensureFile();
  const raw = await readFile(STORE_PATH, "utf-8");
  return StoreSchema.parse(JSON.parse(raw));
}

/**
 * Read-modify-write helper: `mutate` receives the current store and returns
 * the next one. Runs are queued so concurrent callers don't interleave.
 */
export async function withStore<T>(mutate: (store: Store) => T | Promise<T>): Promise<T> {
  const run = writeQueue.then(async () => {
    const store = await loadStore();
    const result = await mutate(store);
    const validated = StoreSchema.parse(store);
    await writeFile(STORE_PATH, JSON.stringify(validated, null, 2), "utf-8");
    return result;
  });
  // Keep the queue alive even if this run rejects, so later writes still run.
  writeQueue = run.catch(() => undefined);
  return run;
}

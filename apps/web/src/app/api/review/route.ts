import { loadStore } from "@/server/platform/store";
import { requireProjectAccess } from "@/server/platform/session";
import { jsonData, withApiErrors } from "@/server/platform/http";
import { runReview } from "@/features/intelligence/review-service";

/** Runs the risk specialist. It proposes; it never approves and never publishes. */
export async function POST() {
  return withApiErrors(async () => {
    const store = await loadStore();
    await requireProjectAccess(store.project.id, "write");
    const { review, proposal } = await runReview();
    return jsonData({ review, proposal }, 201);
  });
}

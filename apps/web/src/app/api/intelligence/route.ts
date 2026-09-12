import { loadStore } from "@/server/platform/store";
import { requireProjectAccess } from "@/server/platform/session";
import { jsonData, withApiErrors } from "@/server/platform/http";

/** The review side of the room, for the client's poll. No secrets, stable order. */
export async function GET() {
  return withApiErrors(async () => {
    const store = await loadStore();
    await requireProjectAccess(store.project.id, "read");
    return jsonData({
      snapshot: store.snapshot,
      reviews: store.reviews,
      proposals: store.proposals,
    });
  });
}

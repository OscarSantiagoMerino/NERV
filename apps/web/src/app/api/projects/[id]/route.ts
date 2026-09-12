import { loadStore } from "@/server/platform/store";
import { requireProjectAccess } from "@/server/platform/session";
import { jsonData, jsonError, withApiErrors } from "@/server/platform/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id } = await params;
    await requireProjectAccess(id, "read");
    const store = await loadStore();
    if (store.project.id !== id) {
      return jsonError(404, "NOT_FOUND", `No project with id '${id}'.`);
    }
    return jsonData(store.project);
  });
}

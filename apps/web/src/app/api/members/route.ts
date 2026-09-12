import type { NextRequest } from "next/server";
import { loadStore } from "@/server/platform/store";
import { requireProjectAccess } from "@/server/platform/session";
import { jsonData, jsonError, withApiErrors } from "@/server/platform/http";

export async function GET(request: NextRequest) {
  return withApiErrors(async () => {
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId) {
      return jsonError(400, "MISSING_PROJECT_ID", "Query param 'projectId' is required.");
    }
    await requireProjectAccess(projectId, "read");
    const store = await loadStore();
    return jsonData(store.members);
  });
}

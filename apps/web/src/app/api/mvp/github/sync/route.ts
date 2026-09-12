import { buildAndSaveSnapshot } from "@/server/github/mvp/sync";
import { getDemoContext } from "@/server/platform/mvp";
import { jsonData, withApiErrors } from "@/server/platform/mvp/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/mvp/github/sync — CONTRATOS.md §3, owner P3. */
export async function POST(request: Request) {
  return withApiErrors(async () => {
    const context = getDemoContext(request, { requireOrigin: true });
    const snapshot = await buildAndSaveSnapshot(context.repo);
    return jsonData(snapshot);
  });
}

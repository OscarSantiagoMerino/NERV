import { getDemoContext, rejectProposal } from "@/server/platform/mvp";
import { jsonData, jsonError, withApiErrors } from "@/server/platform/mvp/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/mvp/proposals/:id/reject — CONTRATOS.md §3, owner P3. Never calls GitHub. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: { expectedVersion?: number };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_BODY", "Expected JSON body");
  }
  if (typeof body.expectedVersion !== "number") {
    return jsonError(400, "INVALID_BODY", "expectedVersion is required");
  }

  return withApiErrors(async () => {
    const context = getDemoContext(request, { requireOrigin: true });
    const updated = rejectProposal(id, body.expectedVersion!, context);
    return jsonData(updated);
  });
}

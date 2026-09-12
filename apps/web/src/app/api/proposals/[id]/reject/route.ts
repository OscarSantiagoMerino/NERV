import { z } from "zod";
import { loadStore } from "@/server/platform/store";
import { requireProjectAccess } from "@/server/platform/session";
import { jsonData, jsonError, withApiErrors } from "@/server/platform/http";
import { rejectProposal } from "@/features/intelligence/proposal-service";

const body = z.object({ expectedVersion: z.number().int().positive() });

/** Rejecting is local only: it never reaches GitHub. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError(400, "INVALID_BODY", "An expectedVersion is required to reject.");
    }
    const store = await loadStore();
    await requireProjectAccess(store.project.id, "lead");
    const { id } = await params;
    return jsonData(await rejectProposal(id, parsed.data.expectedVersion));
  });
}

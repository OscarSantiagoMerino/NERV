import { z } from "zod";
import { loadStore } from "@/server/platform/store";
import { requireProjectAccess } from "@/server/platform/session";
import { jsonData, jsonError, withApiErrors } from "@/server/platform/http";
import { approveProposal } from "@/features/intelligence/proposal-service";

const body = z.object({ expectedVersion: z.number().int().positive() });

/**
 * The only path that writes to GitHub, and only the lead can take it.
 * What gets published is the stored payload, unchanged — the client sends
 * a version, never text.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError(400, "INVALID_BODY", "An expectedVersion is required to approve.");
    }
    const store = await loadStore();
    const approver = await requireProjectAccess(store.project.id, "lead");
    const { id } = await params;
    return jsonData(await approveProposal(id, parsed.data.expectedVersion, approver));
  });
}

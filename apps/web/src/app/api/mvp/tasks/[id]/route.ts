import { getDemoContext, updateTask } from "@/server/platform/mvp";
import { jsonData, jsonError, withApiErrors } from "@/server/platform/mvp/http";
import { PatchTaskBodySchema } from "@/contracts/mvp";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const context = getDemoContext(request, { requireOrigin: true });
    const { id } = await params;
    const parsed = PatchTaskBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError(400, "INVALID_BODY", "Body must be { workflowState, expectedVersion }.");
    }
    const task = updateTask(id, parsed.data.workflowState, parsed.data.expectedVersion, context);
    return jsonData(task);
  });
}

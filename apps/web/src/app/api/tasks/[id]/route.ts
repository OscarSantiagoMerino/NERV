import { z } from "zod";
import { loadStore, withStore } from "@/server/platform/store";
import { requireProjectAccess } from "@/server/platform/session";
import { jsonData, jsonError, withApiErrors } from "@/server/platform/http";

const taskPatch = z.object({
  expectedVersion: z.number().int().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).optional(),
  acceptanceCriteria: z.string().trim().max(2000).optional(),
  workflowState: z.enum(["todo", "doing", "done"]).optional(),
  responsibleId: z.string().min(1).nullable().optional(),
  milestoneId: z.string().min(1).nullable().optional(),
  dueAt: z.string().min(1).nullable().optional(),
  estimateMinutes: z.number().int().min(0).nullable().optional(),
  blocked: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrors(async () => {
    const parsed = taskPatch.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError(400, "INVALID_BODY", parsed.error.issues[0].message);
    }
    const { expectedVersion, ...patch } = parsed.data;
    const { id } = await params;

    const existing = (await loadStore()).tasks.find((task) => task.id === id);
    if (existing === undefined) {
      return jsonError(404, "NOT_FOUND", "That task no longer exists.");
    }
    await requireProjectAccess(existing.projectId, "write");

    const outcome = await withStore((store) => {
      const index = store.tasks.findIndex((task) => task.id === id);
      if (index === -1) return { error: "NOT_FOUND" as const };

      const current = store.tasks[index];
      if (current.version !== expectedVersion) {
        return { error: "VERSION_CONFLICT" as const };
      }
      if (
        patch.responsibleId !== undefined &&
        patch.responsibleId !== null &&
        !store.members.some((member) => member.id === patch.responsibleId)
      ) {
        return { error: "UNKNOWN_MEMBER" as const };
      }
      if (
        patch.milestoneId !== undefined &&
        patch.milestoneId !== null &&
        !store.project.milestones.some((milestone) => milestone.id === patch.milestoneId)
      ) {
        return { error: "UNKNOWN_MILESTONE" as const };
      }

      const updated = { ...current, ...patch, version: current.version + 1 };
      store.tasks[index] = updated;
      return { task: updated };
    });

    if ("error" in outcome) {
      switch (outcome.error) {
        case "NOT_FOUND":
          return jsonError(404, outcome.error, "That task no longer exists.");
        case "VERSION_CONFLICT":
          return jsonError(409, outcome.error, "The project changed; review the latest version.");
        case "UNKNOWN_MEMBER":
          return jsonError(400, outcome.error, "That member is not part of this project.");
        case "UNKNOWN_MILESTONE":
          return jsonError(400, outcome.error, "That milestone is not part of this project.");
      }
    }

    return jsonData(outcome.task);
  });
}

import { z } from "zod";
import { data, failure, resolveActor, route } from "@/features/workspace/server/access";
import { updateTask } from "@/features/workspace/server/store";

const taskPatch = z.object({
  expectedVersion: z.number().int().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).optional(),
  acceptanceCriteria: z.string().trim().max(2000).optional(),
  workflowState: z.enum(["todo", "doing", "done"]).optional(),
  responsibleId: z.string().uuid().nullable().optional(),
  milestoneId: z.string().uuid().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  estimateMinutes: z.number().int().min(0).nullable().optional(),
  blocked: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return route(async () => {
    await resolveActor(request);
    const parsed = taskPatch.safeParse(await request.json());
    if (!parsed.success) {
      return failure(422, "invalid_input", parsed.error.issues[0].message);
    }

    const { expectedVersion, ...patch } = parsed.data;
    const { id } = await params;
    return data({ task: await updateTask(id, patch, expectedVersion) });
  });
}

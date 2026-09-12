import { z } from "zod";
import { data, failure, resolveActor, route } from "@/features/workspace/server/access";
import { createTask, readSnapshot } from "@/features/workspace/server/store";

const newTask = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).default(""),
  acceptanceCriteria: z.string().trim().max(2000).default(""),
  milestoneId: z.string().uuid().nullable().default(null),
  responsibleId: z.string().uuid().nullable().default(null),
  dueAt: z.string().datetime().nullable().default(null),
  estimateMinutes: z.number().int().min(0).nullable().default(null),
});

export async function GET(request: Request) {
  return route(async () => {
    await resolveActor(request);
    const snapshot = await readSnapshot();
    return data({ tasks: snapshot.tasks });
  });
}

export async function POST(request: Request) {
  return route(async () => {
    await resolveActor(request);
    const parsed = newTask.safeParse(await request.json());
    if (!parsed.success) {
      return failure(422, "invalid_input", parsed.error.issues[0].message);
    }
    return data({ task: await createTask(parsed.data) }, 201);
  });
}

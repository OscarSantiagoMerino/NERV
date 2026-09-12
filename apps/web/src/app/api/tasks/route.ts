import { randomUUID } from "node:crypto";
import { z } from "zod";
import { loadStore, withStore } from "@/server/platform/store";
import { requireProjectAccess } from "@/server/platform/session";
import { jsonData, jsonError, withApiErrors } from "@/server/platform/http";
import type { Task } from "@/contracts/schemas";

const newTask = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).default(""),
  acceptanceCriteria: z.string().trim().max(2000).default(""),
  milestoneId: z.string().min(1).nullable().default(null),
  responsibleId: z.string().min(1).nullable().default(null),
  dueAt: z.string().min(1).nullable().default(null),
  estimateMinutes: z.number().int().min(0).nullable().default(null),
});

export async function GET(request: Request) {
  return withApiErrors(async () => {
    const projectId = new URL(request.url).searchParams.get("projectId");
    if (projectId === null) {
      return jsonError(400, "MISSING_PROJECT_ID", "Query param 'projectId' is required.");
    }
    await requireProjectAccess(projectId, "read");
    const store = await loadStore();
    return jsonData(store.tasks);
  });
}

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const parsed = newTask.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError(400, "INVALID_BODY", parsed.error.issues[0].message);
    }
    const input = parsed.data;
    await requireProjectAccess(input.projectId, "write");

    type Result =
      | { ok: true; task: Task }
      | { ok: false; code: "UNKNOWN_MEMBER" | "UNKNOWN_MILESTONE" };

    const result = await withStore<Result>((store) => {
      if (
        input.responsibleId !== null &&
        !store.members.some((member) => member.id === input.responsibleId)
      ) {
        return { ok: false, code: "UNKNOWN_MEMBER" };
      }
      if (
        input.milestoneId !== null &&
        !store.project.milestones.some((milestone) => milestone.id === input.milestoneId)
      ) {
        return { ok: false, code: "UNKNOWN_MILESTONE" };
      }

      const task: Task = {
        id: randomUUID(),
        projectId: store.project.id,
        origin: "manual",
        milestoneId: input.milestoneId,
        title: input.title,
        description: input.description,
        workflowState: "todo",
        responsibleId: input.responsibleId,
        dueAt: input.dueAt,
        estimateMinutes: input.estimateMinutes,
        acceptanceCriteria: input.acceptanceCriteria,
        blocked: false,
        githubIssueNumber: null,
        githubUrl: null,
        version: 1,
      };
      store.tasks.push(task);
      return { ok: true, task };
    });

    if (!result.ok) {
      return jsonError(
        400,
        result.code,
        result.code === "UNKNOWN_MEMBER"
          ? "That member is not part of this project."
          : "That milestone is not part of this project.",
      );
    }
    return jsonData(result.task, 201);
  });
}

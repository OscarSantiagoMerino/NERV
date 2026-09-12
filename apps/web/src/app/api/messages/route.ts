import { randomUUID } from "node:crypto";
import { z } from "zod";
import { loadStore, withStore } from "@/server/platform/store";
import { requireProjectAccess } from "@/server/platform/session";
import { jsonData, jsonError, withApiErrors } from "@/server/platform/http";
import { MESSAGE_MAX_LENGTH } from "@/features/workspace/constants";
import type { Message } from "@/contracts/schemas";

const PAGE_SIZE = 50;

const newMessage = z.object({
  projectId: z.string().min(1),
  text: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
});

export async function GET(request: Request) {
  return withApiErrors(async () => {
    const projectId = new URL(request.url).searchParams.get("projectId");
    if (projectId === null) {
      return jsonError(400, "MISSING_PROJECT_ID", "Query param 'projectId' is required.");
    }
    await requireProjectAccess(projectId, "read");
    const store = await loadStore();
    return jsonData(store.messages.slice(-PAGE_SIZE));
  });
}

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const parsed = newMessage.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError(400, "INVALID_BODY", parsed.error.issues[0].message);
    }
    const author = await requireProjectAccess(parsed.data.projectId, "write");

    const message = await withStore((store) => {
      const created: Message = {
        id: randomUUID(),
        projectId: store.project.id,
        authorMemberId: author.id,
        text: parsed.data.text,
        createdAt: new Date().toISOString(),
      };
      store.messages.push(created);
      return created;
    });

    return jsonData(message, 201);
  });
}

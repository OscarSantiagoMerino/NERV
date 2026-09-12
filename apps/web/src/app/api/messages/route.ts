import { z } from "zod";
import { data, failure, resolveActor, route } from "@/features/workspace/server/access";
import { appendMessage, readSnapshot } from "@/features/workspace/server/store";
import { MESSAGE_MAX_LENGTH } from "@/features/workspace/types";

const PAGE_SIZE = 50;

const newMessage = z.object({
  text: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
});

export async function GET(request: Request) {
  return route(async () => {
    await resolveActor(request);
    const snapshot = await readSnapshot();
    return data({ messages: snapshot.messages.slice(-PAGE_SIZE) });
  });
}

export async function POST(request: Request) {
  return route(async () => {
    const actor = await resolveActor(request);
    const parsed = newMessage.safeParse(await request.json());
    if (!parsed.success) {
      return failure(422, "invalid_input", parsed.error.issues[0].message);
    }
    return data({ message: await appendMessage(actor.id, parsed.data.text) }, 201);
  });
}

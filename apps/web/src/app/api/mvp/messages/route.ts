import { getDemoContext, appendMessage } from "@/server/platform/mvp";
import { jsonData, jsonError, withApiErrors } from "@/server/platform/mvp/http";
import { PostMessageBodySchema } from "@/contracts/mvp";

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const context = getDemoContext(request, { requireOrigin: true });
    const parsed = PostMessageBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError(400, "INVALID_BODY", "Body must be { text: string }.");
    }
    const message = appendMessage(parsed.data.text, context);
    return jsonData(message);
  });
}

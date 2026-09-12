import type { NextRequest } from "next/server";
import { getCurrentMember, setCurrentMember, clearCurrentMember } from "@/server/platform/session";
import { jsonData, jsonError, withApiErrors } from "@/server/platform/http";

export async function GET() {
  return withApiErrors(async () => {
    const member = await getCurrentMember();
    return jsonData({ member });
  });
}

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const body = await request.json().catch(() => null);
    const memberId = typeof body?.memberId === "string" ? body.memberId : null;
    if (!memberId) {
      return jsonError(400, "INVALID_BODY", "Body must be { memberId: string }.");
    }
    const member = await setCurrentMember(memberId);
    return jsonData({ member });
  });
}

export async function DELETE() {
  return withApiErrors(async () => {
    await clearCurrentMember();
    return jsonData({ ok: true });
  });
}

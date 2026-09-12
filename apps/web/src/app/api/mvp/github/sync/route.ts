import { NextResponse } from "next/server";
import { buildAndSaveSnapshot } from "@/server/github/mvp/sync";
import { getDemoContext } from "@/server/ai/mvp/tempStore";
import { errorResponse } from "@/server/ai/mvp/httpErrors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/mvp/github/sync — CONTRATOS.md §3, owner P3. */
export async function POST(request: Request) {
  try {
    const context = getDemoContext(request);
    const snapshot = await buildAndSaveSnapshot(context.repo);
    return NextResponse.json({ data: snapshot });
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { getDemoContext, rejectProposal } from "@/server/ai/mvp/tempStore";
import { errorResponse } from "@/server/ai/mvp/httpErrors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/mvp/proposals/:id/reject — CONTRATOS.md §3, owner P3. Never calls GitHub. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: { expectedVersion?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "Expected JSON body", retryable: false } },
      { status: 400 },
    );
  }
  if (typeof body.expectedVersion !== "number") {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "expectedVersion is required", retryable: false } },
      { status: 400 },
    );
  }

  try {
    const context = getDemoContext(request);
    const updated = rejectProposal(id, body.expectedVersion, context);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

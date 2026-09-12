import { NextResponse } from "next/server";
import { buildAndSaveSnapshot } from "@/server/github/mvp/sync";
import { reviewRisk, toReview, proposalMarker } from "@/server/ai/mvp/specialist";
import { getDemoContext, getProject, listTasks, saveReviewAndProposal } from "@/server/ai/mvp/tempStore";
import { errorResponse } from "@/server/ai/mvp/httpErrors";
import type { Proposal } from "@/server/ai/mvp/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/mvp/review — CONTRATOS.md §3/§5, owner P3. Body: {}. */
export async function POST(request: Request) {
  try {
    const context = getDemoContext(request);

    // "refresca GitHub para crear Snapshot live antes de revisar" — §5.
    const snapshot = await buildAndSaveSnapshot(context.repo);
    const project = getProject();
    const tasks = listTasks();

    const result = await reviewRisk(project, tasks);
    const reviewId = `review_${Date.now()}`;
    const { review, proposalPayload } = toReview(reviewId, snapshot.id, result);

    let proposal: Proposal | null = null;
    if (proposalPayload) {
      const proposalId = `proposal_${Date.now()}`;
      proposal = {
        id: proposalId,
        reviewId,
        version: 1,
        status: "pending",
        payload: {
          title: proposalPayload.title,
          // Marker embedded before persisting, per CONTRATOS.md §5 step 3.
          body: `${proposalPayload.body}\n\n${proposalMarker(proposalId)}`,
        },
        rationale: result.summary,
        evidenceTaskIds: result.evidenceTaskIds,
        createdAt: new Date().toISOString(),
        approvedAt: null,
        approvedByDemoProfileId: null,
        result: null,
        error: null,
      };
      review.proposalId = proposal.id;
    }

    saveReviewAndProposal(review, proposal);
    return NextResponse.json({ data: review });
  } catch (error) {
    return errorResponse(error);
  }
}

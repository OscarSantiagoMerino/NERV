import type { Proposal } from "@/contracts/mvp";
import { buildAndSaveSnapshot } from "@/server/github/mvp/sync";
import { proposalMarker, reviewRisk, toReview } from "@/server/ai/mvp/specialist";
import { getDemoContext, getState, saveReviewAndProposal } from "@/server/platform/mvp";
import { jsonData, withApiErrors } from "@/server/platform/mvp/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/mvp/review — CONTRATOS.md §3/§5, owner P3. Body: {}. */
export async function POST(request: Request) {
  return withApiErrors(async () => {
    const context = getDemoContext(request, { requireOrigin: true });

    // "refresca GitHub para crear Snapshot live antes de revisar" — §5.
    const snapshot = await buildAndSaveSnapshot(context.repo);
    const state = getState();

    const result = await reviewRisk(state.project, state.tasks);
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
        ambiguous: null,
        ambiguousError: null,
        error: null,
      };
      review.proposalId = proposal.id;
    }

    saveReviewAndProposal(review, proposal);
    return jsonData(review);
  });
}

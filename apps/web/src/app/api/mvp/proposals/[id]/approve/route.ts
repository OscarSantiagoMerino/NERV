import { createAmbiguousRecord, createIssue, getIssue, GithubClientError } from "@/server/github/mvp/client";
import {
  claimProposal,
  DemoError,
  finishProposal,
  getDemoContext,
  getSnapshot,
  getState,
} from "@/server/platform/mvp";
import { jsonData, jsonError, withApiErrors } from "@/server/platform/mvp/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/mvp/proposals/:id/approve — CONTRATOS.md §3/§5, owner P3.
 * The one action that must work live: creates a real GitHub issue, exactly
 * once, even under a double click or concurrent request.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: { expectedVersion?: number };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_BODY", "Expected JSON body");
  }
  if (typeof body.expectedVersion !== "number") {
    return jsonError(400, "INVALID_BODY", "expectedVersion is required");
  }

  return withApiErrors(async () => {
    const context = getDemoContext(request, { requireOrigin: true });
    const state = getState();

    const proposal = state.proposals.find((p) => p.id === id);
    if (!proposal) throw new DemoError(404, "NOT_FOUND", `Proposal ${id} not found`);
    const review = state.reviews.find((r) => r.id === proposal.reviewId);
    if (!review) throw new DemoError(404, "NOT_FOUND", `Review ${proposal.reviewId} not found`);

    // Staleness check against the original snapshot's cited evidence —
    // CONTRATOS.md §5 step 1, conservative repo/number/updatedAt only.
    const snapshot = getSnapshot(review.snapshotId);
    if (!snapshot || snapshot.mode !== "live") {
      throw new DemoError(409, "STALE_SNAPSHOT", "Original snapshot is missing or not live — request a new review.", true);
    }
    for (const taskId of review.evidenceTaskIds) {
      const task = state.tasks.find((t) => t.id === taskId);
      if (!task) continue;
      const fresh = await getIssue(context.repo, task.github.number).catch(() => null);
      if (!fresh || fresh.updatedAt !== task.github.updatedAt) {
        throw new DemoError(
          409,
          "EVIDENCE_CHANGED",
          `Issue #${task.github.number} changed since the review — request a new review.`,
          true,
        );
      }
    }

    const { claimed, proposal: claimedProposal } = claimProposal(id, body.expectedVersion!, context);
    if (!claimed) {
      // Already executing/applied/rejected/etc. — return current state, no re-publish.
      return jsonData(claimedProposal);
    }

    try {
      const issue = await createIssue(context.repo, {
        title: claimedProposal.payload.title,
        body: claimedProposal.payload.body,
      });

      // Ambiguous step (CONTRATOS.md §10, authorized) — strictly AFTER the
      // GitHub write, never blocking/competing with it. Its own failure
      // never changes the proposal's applied status.
      const ambiguousOutcome = await createAmbiguousRecord(claimedProposal.payload.title, claimedProposal.payload.body);

      const updated = finishProposal(id, {
        status: "applied",
        result: { number: issue.number, url: issue.htmlUrl },
        ambiguous: ambiguousOutcome.result,
        ambiguousError: ambiguousOutcome.error,
        newTask: {
          id: `task_${context.repo}_${issue.number}`,
          title: issue.title,
          body: issue.body ?? "",
          milestoneId: state.project.milestone.id,
          ownerProfileId: null,
          workflowState: "todo",
          github: {
            repo: context.repo,
            number: issue.number,
            url: issue.htmlUrl,
            state: issue.state,
            labels: issue.labels,
            updatedAt: issue.updatedAt,
          },
          version: 1,
          updatedAt: new Date().toISOString(),
        },
      });
      return jsonData(updated);
    } catch (writeError) {
      // A definite HTTP rejection (GithubClientError) means it was NOT
      // created — anything else (network/timeout) is genuinely uncertain.
      const status = writeError instanceof GithubClientError ? "failed" : "uncertain";
      const updated = finishProposal(id, {
        status,
        error: {
          code: status,
          message: writeError instanceof Error ? writeError.message : String(writeError),
        },
      });
      return jsonData(updated);
    }
  });
}

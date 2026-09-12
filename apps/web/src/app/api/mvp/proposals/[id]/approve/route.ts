import { NextResponse } from "next/server";
import { createIssue, getIssue, GithubClientError } from "@/server/github/mvp/client";
import {
  claimProposal,
  DemoContextError,
  finishProposal,
  getDemoContext,
  getProposal,
  getReview,
  getTask,
  getSnapshot,
} from "@/server/ai/mvp/tempStore";
import { errorResponse } from "@/server/ai/mvp/httpErrors";

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

    // Staleness check against the original snapshot's cited evidence,
    // per CONTRATOS.md §5 step 1 — conservative repo/number/updatedAt only.
    const proposalBefore = getReviewSnapshotOrThrow(id);
    for (const taskId of proposalBefore.review.evidenceTaskIds) {
      const task = getTask(taskId);
      if (!task) continue; // nothing cited yet, or task no longer tracked
      const fresh = await getIssue(context.repo, task.github.number).catch(() => null);
      if (!fresh || fresh.updatedAt !== task.github.updatedAt) {
        return NextResponse.json(
          {
            error: {
              code: "evidence_changed",
              message: `Issue #${task.github.number} changed since the review — request a new review.`,
              retryable: false,
            },
          },
          { status: 409 },
        );
      }
    }

    const { claimed, proposal } = claimProposal(id, body.expectedVersion, context);
    if (!claimed) {
      // Already executing/applied/rejected/etc. — return current state, no re-publish.
      return NextResponse.json({ data: proposal });
    }

    try {
      const issue = await createIssue(context.repo, {
        title: proposal.payload.title,
        body: proposal.payload.body,
      });
      const updated = finishProposal(id, {
        status: "applied",
        result: { number: issue.number, url: issue.htmlUrl },
        newTask: {
          id: `task_${context.repo}_${issue.number}`,
          title: issue.title,
          body: issue.body ?? "",
          milestoneId: "milestone_ready",
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
      return NextResponse.json({ data: updated });
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
      return NextResponse.json({ data: updated });
    }
  } catch (error) {
    return errorResponse(error);
  }
}

function getReviewSnapshotOrThrow(proposalId: string) {
  const proposal = mustGetProposal(proposalId);
  const review = mustGetReview(proposal.reviewId);
  const snapshot = getSnapshot(review.snapshotId);
  if (!snapshot || snapshot.mode !== "live") {
    throw new DemoContextError("stale_snapshot", "Original snapshot is missing or not live — request a new review.");
  }
  return { proposal, review };
}

function mustGetProposal(id: string) {
  const proposal = getProposal(id);
  if (!proposal) throw new DemoContextError("not_found", `Proposal ${id} not found`);
  return proposal;
}

function mustGetReview(id: string) {
  const review = getReview(id);
  if (!review) throw new DemoContextError("not_found", `Review ${id} not found`);
  return review;
}

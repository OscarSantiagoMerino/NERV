import { randomUUID } from "node:crypto";
import type { Proposal, Review, Snapshot, Store } from "@/contracts/schemas";
import { loadStore, withStore } from "@/server/platform/store";
import { GitHubError } from "@/server/github/client";
import { markerComment, proposalMarker } from "@/server/github/config";
import { syncGitHub } from "@/server/github/sync";
import { runRiskSpecialist } from "@/server/ai/risk-specialist";
import { AccessError } from "@/server/platform/session";

/** Carries the same envelope as every other refusal the API can return. */
export class ReviewError extends AccessError {}

/**
 * A review reads GitHub first, so the evidence it cites is the evidence that
 * existed when it ran. If that read fails we fall back to the last snapshot
 * and say so — but a review with no snapshot at all has nothing to cite, and
 * is refused rather than invented.
 */
async function evidenceSnapshot(): Promise<Snapshot> {
  try {
    const outcome = await syncGitHub();
    return outcome.snapshot;
  } catch (error) {
    const previous = (await loadStore()).snapshot;
    if (previous === null) {
      const message =
        error instanceof GitHubError
          ? `${error.message} There is no earlier snapshot to review against.`
          : "GitHub could not be read and there is no earlier snapshot to review against.";
      throw new ReviewError(503, "NO_EVIDENCE", message, true);
    }
    return {
      ...previous,
      // A new id: this is a distinct, degraded reading, and an approval that
      // checks `complete` must not be handed the intact original instead.
      id: randomUUID(),
      complete: false,
      limitations: [
        ...previous.limitations,
        `GitHub could not be read for this review; evidence is the snapshot taken at ${previous.fetchedAt}.`,
      ],
    };
  }
}

function taskIdsForIssues(store: Store, numbers: number[]): string[] {
  return numbers
    .map((number) => store.tasks.find((task) => task.githubIssueNumber === number)?.id)
    .filter((id): id is string => id !== undefined);
}

export type ReviewResult = { review: Review; proposal: Proposal | null; snapshot: Snapshot };

export async function runReview(): Promise<ReviewResult> {
  const snapshot = await evidenceSnapshot();
  const store = await loadStore();
  const { finding, source } = await runRiskSpecialist(store, snapshot);

  const reviewId = randomUUID();
  const proposalId = finding.proposal === null ? null : randomUUID();
  const createdAt = new Date().toISOString();
  const evidenceTaskIds = taskIdsForIssues(store, finding.evidenceIssueNumbers);

  const review: Review = {
    id: reviewId,
    createdAt,
    snapshotId: snapshot.id,
    charterStatus: store.project.charter.status,
    projectVersion: store.project.version,
    source,
    goalImpact: finding.goalImpact,
    summary: finding.summary,
    evidenceTaskIds,
    observations: finding.observations,
    inferences: finding.inferences,
    limitations: finding.limitations,
    proposalId,
  };

  const proposal: Proposal | null =
    finding.proposal === null || proposalId === null
      ? null
      : {
          id: proposalId,
          reviewId,
          version: 1,
          status: "pending",
          payload: {
            title: finding.proposal.title,
            // The marker goes in before the proposal is stored, so the text a
            // lead approves is byte-for-byte the text that reaches GitHub —
            // and a lost response can still be reconciled by searching for it.
            body: `${finding.proposal.body.trim()}\n\n${markerComment(proposalId)}`,
          },
          rationale: finding.proposal.rationale,
          evidenceTaskIds,
          marker: proposalMarker(proposalId),
          createdAt,
          approvedAt: null,
          approvedByMemberId: null,
          result: null,
          error: null,
        };

  await withStore((current) => {
    // The snapshot syncGitHub wrote is already there; a fallback snapshot is
    // a modified copy of an older one and has to be recorded to be citable.
    if (current.snapshots.every((item) => item.id !== snapshot.id)) {
      current.snapshots = [...current.snapshots, snapshot].slice(-20);
    }
    current.reviews = [...current.reviews, review];
    if (proposal !== null) current.proposals = [...current.proposals, proposal];
  });

  return { review, proposal, snapshot };
}

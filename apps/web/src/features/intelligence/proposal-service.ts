import { randomUUID } from "node:crypto";
import type { GitHubRef, Member, Proposal, Snapshot, Store, Task } from "@/contracts/schemas";
import { loadStore, withStore } from "@/server/platform/store";
import { GitHubError, createIssue, listIssues } from "@/server/github/client";
import { githubConfig } from "@/server/github/config";
import { currentMilestoneId } from "@/server/github/sync";
import { ReviewError } from "./review-service";

/**
 * Checks the evidence a review cited is still what it was.
 *
 * Conservative on purpose: any change to an issue's repo, number or
 * updatedAt sends the lead back to a fresh review rather than asking NERV
 * to decide whether the change mattered.
 */
export function evidenceDrift(
  snapshot: Snapshot,
  cited: number[],
  current: GitHubRef[],
): string[] {
  const problems: string[] = [];
  for (const number of cited) {
    const original = snapshot.issues.find((issue) => issue.number === number);
    if (original === undefined) {
      problems.push(`#${number} was cited but is not in the snapshot this review read.`);
      continue;
    }
    const now = current.find((issue) => issue.number === number);
    if (now === undefined) {
      problems.push(`#${number} is no longer visible in ${snapshot.repo}.`);
      continue;
    }
    if (now.repo !== original.repo) {
      problems.push(`#${number} now belongs to ${now.repo}, not ${original.repo}.`);
      continue;
    }
    if (now.updatedAt !== original.updatedAt) {
      problems.push(`#${number} changed at ${now.updatedAt}, after this review read it.`);
    }
  }
  return problems;
}

function findProposal(store: Store, id: string): Proposal {
  const proposal = store.proposals.find((candidate) => candidate.id === id);
  if (proposal === undefined) {
    throw new ReviewError(404, "NOT_FOUND", "That proposal no longer exists.");
  }
  return proposal;
}

/** Terminal for the purposes of approving: publishing again would duplicate. */
function isSettled(status: Proposal["status"]): boolean {
  return status !== "pending";
}

export async function rejectProposal(id: string, expectedVersion: number): Promise<Proposal> {
  return withStore((store) => {
    const index = store.proposals.findIndex((candidate) => candidate.id === id);
    if (index === -1) throw new ReviewError(404, "NOT_FOUND", "That proposal no longer exists.");
    const current = store.proposals[index];
    if (current.status !== "pending") {
      throw new ReviewError(
        409,
        "NOT_PENDING",
        `This proposal is ${current.status}; only a pending one can be rejected.`,
      );
    }
    if (current.version !== expectedVersion) {
      throw new ReviewError(409, "VERSION_CONFLICT", "The proposal changed; reload it first.");
    }
    // Rejecting never calls GitHub. The record is kept so the room shows
    // that a mitigation was considered and turned down.
    const rejected: Proposal = { ...current, status: "rejected", version: current.version + 1 };
    store.proposals[index] = rejected;
    return rejected;
  });
}

/**
 * Moves pending -> executing under a version condition, so exactly one
 * caller wins. Two clicks, two tabs, or a retried request all reach here;
 * only the one that claims goes on to call GitHub.
 */
async function claimProposal(
  id: string,
  expectedVersion: number,
  approver: Member,
): Promise<{ claimed: boolean; proposal: Proposal }> {
  return withStore((store) => {
    const index = store.proposals.findIndex((candidate) => candidate.id === id);
    if (index === -1) throw new ReviewError(404, "NOT_FOUND", "That proposal no longer exists.");
    const current = store.proposals[index];
    if (isSettled(current.status)) return { claimed: false, proposal: current };
    if (current.version !== expectedVersion) {
      throw new ReviewError(409, "VERSION_CONFLICT", "The proposal changed; reload it first.");
    }
    const claimed: Proposal = {
      ...current,
      status: "executing",
      version: current.version + 1,
      approvedAt: new Date().toISOString(),
      approvedByMemberId: approver.id,
    };
    store.proposals[index] = claimed;
    return { claimed: true, proposal: claimed };
  });
}

type Outcome =
  | { status: "applied"; result: { repo: string; number: number; url: string } }
  | { status: "failed" | "uncertain"; error: { code: string; message: string } };

/** Records the result and, when applied, the new card — in one write. */
async function finishProposal(id: string, outcome: Outcome): Promise<Proposal> {
  return withStore((store) => {
    const index = store.proposals.findIndex((candidate) => candidate.id === id);
    if (index === -1) throw new ReviewError(404, "NOT_FOUND", "That proposal no longer exists.");
    const current = store.proposals[index];
    const finished: Proposal =
      outcome.status === "applied"
        ? {
            ...current,
            status: "applied",
            version: current.version + 1,
            result: outcome.result,
            error: null,
          }
        : {
            ...current,
            status: outcome.status,
            version: current.version + 1,
            error: outcome.error,
          };
    store.proposals[index] = finished;

    if (outcome.status === "applied") {
      const existing = store.tasks.find(
        (task) => task.githubIssueNumber === outcome.result.number,
      );
      if (existing === undefined) {
        const task: Task = {
          id: randomUUID(),
          projectId: store.project.id,
          origin: "github",
          milestoneId: currentMilestoneId(store.project),
          title: current.payload.title,
          description: current.payload.body,
          workflowState: "todo",
          responsibleId: null, // a person picks the owner and the date
          dueAt: null,
          estimateMinutes: null,
          acceptanceCriteria: "",
          blocked: false,
          githubIssueNumber: outcome.result.number,
          githubUrl: outcome.result.url,
          githubState: "open",
          githubLabels: [],
          githubUpdatedAt: new Date().toISOString(),
          version: 1,
        };
        store.tasks.push(task);
      }
    }
    return finished;
  });
}

export async function approveProposal(
  id: string,
  expectedVersion: number,
  approver: Member,
): Promise<Proposal> {
  const config = githubConfig();
  const store = await loadStore();
  const proposal = findProposal(store, id);

  // Already settled: hand back what happened instead of publishing again.
  if (isSettled(proposal.status)) return proposal;

  if (proposal.version !== expectedVersion) {
    throw new ReviewError(409, "VERSION_CONFLICT", "The proposal changed; reload it first.");
  }

  const review = store.reviews.find((candidate) => candidate.id === proposal.reviewId);
  const snapshot =
    review === undefined
      ? undefined
      : store.snapshots.find((candidate) => candidate.id === review.snapshotId);
  if (review === undefined || snapshot === undefined) {
    throw new ReviewError(
      409,
      "EVIDENCE_MISSING",
      "The evidence this proposal was built on is no longer on file. Run the review again.",
    );
  }
  if (snapshot.mode !== config.mode) {
    throw new ReviewError(
      409,
      "EVIDENCE_MODE",
      `This proposal was reviewed against a ${snapshot.mode} snapshot but GitHub is now in ` +
        `${config.mode} mode. Run the review again.`,
    );
  }

  // Re-read before claiming: if GitHub cannot be read, nothing is published
  // and nothing is marked executing.
  const cited = proposal.evidenceTaskIds
    .map((taskId) => store.tasks.find((task) => task.id === taskId)?.githubIssueNumber)
    .filter((number): number is number => typeof number === "number");
  let current: GitHubRef[];
  try {
    current = await listIssues(config);
  } catch (error) {
    const message = error instanceof GitHubError ? error.message : "GitHub could not be read.";
    throw new ReviewError(503, "EVIDENCE_UNREADABLE", `${message} Nothing was published.`, true);
  }

  const drift = evidenceDrift(snapshot, cited, current);
  if (drift.length > 0) {
    throw new ReviewError(409, "EVIDENCE_CHANGED", `${drift.join(" ")} Run the review again.`);
  }

  const claim = await claimProposal(id, expectedVersion, approver);
  if (!claim.claimed) return claim.proposal;

  try {
    const issue = await createIssue(claim.proposal.payload, config);
    if (!issue.body.includes(proposal.marker) || issue.repo !== config.repo) {
      // The answer does not describe the issue we asked for; do not claim
      // success on it, and do not send it again either.
      return finishProposal(id, {
        status: "uncertain",
        error: {
          code: "RESULT_UNVERIFIED",
          message: "GitHub answered, but the issue it described does not match what was sent.",
        },
      });
    }
    return await finishProposal(id, {
      status: "applied",
      result: { repo: issue.repo, number: issue.number, url: issue.url },
    });
  } catch (error) {
    if (error instanceof GitHubError && !error.ambiguous) {
      return finishProposal(id, {
        status: "failed",
        error: { code: error.code, message: error.message },
      });
    }
    const message =
      error instanceof GitHubError ? error.message : "The request was sent but never answered.";
    // Ambiguous: the issue may exist. Never retried automatically — a sync
    // looks for the marker instead.
    return finishProposal(id, {
      status: "uncertain",
      error: { code: "RESULT_UNKNOWN", message },
    });
  }
}

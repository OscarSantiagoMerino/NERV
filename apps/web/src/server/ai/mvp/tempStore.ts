/**
 * TEMPORARY — stands in for P2's src/server/platform/mvp/index.ts
 * (docs/mvp/CONTRATOS.md §4) so P3 can build/test before P2 publishes the
 * real SQLite-backed store. Same exported function signatures; in-memory
 * only. Delete this file and import from P2's module once it lands —
 * do not extend this into a second permanent store.
 */
import type {
  DemoContext,
  DemoProfile,
  Project,
  Proposal,
  ProposalOutcome,
  Review,
  Snapshot,
  Task,
} from "./types";

const DEMO_PROFILES: DemoProfile[] = [
  { id: "profile_lead", name: "Alex (lead)", roleLabel: "Lead" },
  { id: "profile_dev", name: "Sam (dev)", roleLabel: "Contributor" },
];

/** Placeholder demo project — replace with P2's real seeded fixture. */
const project: Project = {
  id: "proj_demo",
  title: "Validate a signup flow with five test users",
  purpose: "Confirm the new signup flow is usable before wider rollout.",
  goal: "Complete a validation round with five test users.",
  scope: "Signup flow only.",
  successCriterion: "Five documented test runs, critical bugs resolved.",
  milestone: {
    id: "milestone_ready",
    title: "Ready for user validation",
    accountableProfileId: "profile_lead",
  },
  repo: process.env.GITHUB_DEMO_REPO ?? "",
};

const tasks = new Map<string, Task>();
const snapshots = new Map<string, Snapshot>();
const reviews = new Map<string, Review>();
const proposals = new Map<string, Proposal>();

export function getDemoContext(request: Request): DemoContext {
  const url = new URL(request.url);
  const isLoopback = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  if (!isLoopback) {
    throw new DemoContextError("invalid_host", "Demo mode requires a loopback host");
  }

  if (request.headers.get("X-Nerv-Demo") !== "1") {
    throw new DemoContextError("missing_demo_header", "Missing X-Nerv-Demo: 1 header");
  }

  const profileId = request.headers.get("X-Nerv-Profile");
  const profile = DEMO_PROFILES.find((candidate) => candidate.id === profileId);
  if (!profile) {
    throw new DemoContextError("invalid_profile", "X-Nerv-Profile is missing or unknown");
  }

  if (!project.repo) {
    throw new DemoContextError("missing_repo", "GITHUB_DEMO_REPO is not configured");
  }

  return { projectId: project.id, repo: project.repo, profileId: profile.id };
}

export class DemoContextError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DemoContextError";
  }
}

export function getSnapshot(id: string): Snapshot | null {
  return snapshots.get(id) ?? null;
}

export function saveSnapshot(snapshot: Snapshot, normalizedTasks: Task[]): Snapshot {
  snapshots.set(snapshot.id, snapshot);
  for (const task of normalizedTasks) {
    const existing = tasks.get(task.id);
    // Preserve local workflowState; only GitHub-derived fields are refreshed.
    tasks.set(task.id, existing ? { ...task, workflowState: existing.workflowState } : task);
  }
  return snapshot;
}

export function listTasks(): Task[] {
  return Array.from(tasks.values());
}

export function getProject(): Project {
  return project;
}

export function saveReviewAndProposal(review: Review, proposal: Proposal | null): Review {
  reviews.set(review.id, review);
  if (proposal) {
    proposals.set(proposal.id, proposal);
  }
  return review;
}

export function getProposal(id: string): Proposal | undefined {
  return proposals.get(id);
}

export function getReview(id: string): Review | undefined {
  return reviews.get(id);
}

export function getTask(id: string): Task | undefined {
  return tasks.get(id);
}

export function listProposalsByStatus(...statuses: Proposal["status"][]): Proposal[] {
  return Array.from(proposals.values()).filter((proposal) => statuses.includes(proposal.status));
}

export function claimProposal(
  id: string,
  expectedVersion: number,
  _context: DemoContext,
): { claimed: boolean; proposal: Proposal } {
  const proposal = proposals.get(id);
  if (!proposal) {
    throw new DemoContextError("not_found", `Proposal ${id} not found`);
  }
  if (proposal.status !== "pending") {
    return { claimed: false, proposal };
  }
  if (proposal.version !== expectedVersion) {
    throw new DemoContextError("version_conflict", `Expected version ${expectedVersion}, got ${proposal.version}`);
  }
  // Synchronous check-and-set — no await between read and write, so this
  // is atomic under Node's single-threaded event loop.
  const claimed: Proposal = { ...proposal, status: "executing", version: proposal.version + 1 };
  proposals.set(id, claimed);
  return { claimed: true, proposal: claimed };
}

export function rejectProposal(id: string, expectedVersion: number, context: DemoContext): Proposal {
  const proposal = proposals.get(id);
  if (!proposal) {
    throw new DemoContextError("not_found", `Proposal ${id} not found`);
  }
  if (proposal.status !== "pending") {
    throw new DemoContextError("not_pending", `Proposal ${id} is already ${proposal.status}`);
  }
  if (proposal.version !== expectedVersion) {
    throw new DemoContextError("version_conflict", `Expected version ${expectedVersion}, got ${proposal.version}`);
  }
  const updated: Proposal = {
    ...proposal,
    status: "rejected",
    version: proposal.version + 1,
    approvedByDemoProfileId: context.profileId,
    approvedAt: new Date().toISOString(),
  };
  proposals.set(id, updated);
  return updated;
}

export function finishProposal(id: string, outcome: ProposalOutcome): Proposal {
  const proposal = proposals.get(id);
  if (!proposal) {
    throw new DemoContextError("not_found", `Proposal ${id} not found`);
  }
  const updated: Proposal = {
    ...proposal,
    version: proposal.version + 1,
    status: outcome.status,
    result: outcome.status === "applied" ? outcome.result : proposal.result,
    error: outcome.status === "applied" ? null : outcome.error,
  };
  proposals.set(id, updated);
  if (outcome.status === "applied") {
    tasks.set(outcome.newTask.id, outcome.newTask);
  }
  return updated;
}

import { randomUUID } from "node:crypto";
import type { GitHubRef, Project, Proposal, Snapshot, Store, Task } from "@/contracts/schemas";
import { withStore } from "@/server/platform/store";
import { githubConfig, proposalMarker } from "./config";
import { GitHubError, listIssues } from "./client";

const SNAPSHOT_HISTORY = 20;

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** The milestone a newly imported task belongs to: the next one still due. */
export function currentMilestoneId(project: Project, now = Date.now()): string | null {
  const dated = project.milestones
    .filter((milestone) => milestone.dueAt !== null)
    .sort((a, b) => Date.parse(a.dueAt ?? "") - Date.parse(b.dueAt ?? ""));
  const upcoming = dated.find((milestone) => Date.parse(milestone.dueAt ?? "") >= now);
  return upcoming?.id ?? dated.at(-1)?.id ?? project.milestones[0]?.id ?? null;
}

export type ReconcileResult = { tasks: Task[]; imported: number; linked: number; updated: number };

/**
 * Folds a GitHub read into the local tasks.
 *
 * Two rules this must never break: a sync does not touch `workflowState`
 * (NERV's board and GitHub's open/closed are different facts), and it does
 * not delete a task because one read did not mention it — an incomplete
 * read would then look like a repository emptying itself.
 */
export function reconcileTasks(
  tasks: Task[],
  issues: GitHubRef[],
  context: { projectId: string; milestoneId: string | null },
): ReconcileResult {
  const next = [...tasks];
  let imported = 0;
  let linked = 0;
  let updated = 0;

  for (const issue of issues) {
    let index = next.findIndex((task) => task.githubIssueNumber === issue.number);
    const alreadyLinked = index !== -1;
    if (!alreadyLinked) {
      index = next.findIndex(
        (task) =>
          task.githubIssueNumber === null &&
          normalizeTitle(task.title) === normalizeTitle(issue.title),
      );
    }

    if (index === -1) {
      next.push({
        id: randomUUID(),
        projectId: context.projectId,
        origin: "github",
        milestoneId: context.milestoneId,
        title: issue.title,
        description: issue.body,
        workflowState: issue.state === "closed" ? "done" : "todo",
        responsibleId: null, // no automatic mapping from a GitHub login to a member
        dueAt: null,
        estimateMinutes: null,
        acceptanceCriteria: "",
        blocked: issue.labels.includes("blocked"),
        githubIssueNumber: issue.number,
        githubUrl: issue.url,
        githubState: issue.state,
        githubLabels: issue.labels,
        githubUpdatedAt: issue.updatedAt,
        version: 1,
      });
      imported += 1;
      continue;
    }

    const current = next[index];
    const merged: Task = {
      ...current,
      githubIssueNumber: issue.number,
      githubUrl: issue.url,
      githubState: issue.state,
      githubLabels: issue.labels,
      githubUpdatedAt: issue.updatedAt,
      // A `blocked` label raises the flag; only a person lowers it, so a
      // label someone removed in GitHub never silently un-blocks the board.
      blocked: current.blocked || issue.labels.includes("blocked"),
    };
    const changed = JSON.stringify(merged) !== JSON.stringify(current);
    next[index] = changed ? { ...merged, version: current.version + 1 } : current;
    if (!alreadyLinked) linked += 1;
    else if (changed) updated += 1;
  }

  return { tasks: next, imported, linked, updated };
}

/**
 * Closes out proposals whose result was never established, by looking for
 * the marker NERV wrote into the issue body. A marker that is absent from
 * this read leaves the proposal uncertain: the read may be partial.
 */
export function reconcileProposals(
  proposals: Proposal[],
  snapshot: Snapshot,
): { proposals: Proposal[]; settled: Proposal[] } {
  const settled: Proposal[] = [];
  const next = proposals.map((proposal) => {
    if (proposal.status !== "executing" && proposal.status !== "uncertain") return proposal;
    const marker = proposalMarker(proposal.id);
    const match = snapshot.issues.find((issue) => issue.body.includes(marker));
    if (match === undefined) {
      // Executing across a restart is not "in flight" any more; nobody is
      // waiting on that response. Call it uncertain so it shows a path out.
      if (proposal.status === "executing") {
        const downgraded: Proposal = {
          ...proposal,
          status: "uncertain",
          version: proposal.version + 1,
          error: {
            code: "RESULT_UNKNOWN",
            message: "The request was sent but its result was never confirmed.",
          },
        };
        settled.push(downgraded);
        return downgraded;
      }
      return proposal;
    }
    const applied: Proposal = {
      ...proposal,
      status: "applied",
      version: proposal.version + 1,
      result: { repo: match.repo, number: match.number, url: match.url },
      error: null,
    };
    settled.push(applied);
    return applied;
  });
  return { proposals: next, settled };
}

export type SyncOutcome = {
  snapshot: Snapshot;
  imported: number;
  linked: number;
  updated: number;
  reconciled: number;
};

export async function syncGitHub(): Promise<SyncOutcome> {
  const config = githubConfig();
  let issues: GitHubRef[];
  const limitations: string[] = [];
  try {
    issues = await listIssues(config);
  } catch (error) {
    if (error instanceof GitHubError) {
      // Keep the previous snapshot rather than replacing evidence with nothing.
      throw error;
    }
    throw error;
  }
  if (config.mode === "fixture") {
    limitations.push(
      "Fixture repository: no GITHUB_TOKEN is configured, so these issues are local stand-ins.",
    );
  }

  return withStore<SyncOutcome>((store: Store) => {
    const snapshot: Snapshot = {
      id: randomUUID(),
      repo: config.repo,
      fetchedAt: new Date().toISOString(),
      mode: config.mode,
      complete: true,
      issues,
      limitations,
    };

    const result = reconcileTasks(store.tasks, issues, {
      projectId: store.project.id,
      milestoneId: currentMilestoneId(store.project),
    });
    store.tasks = result.tasks;

    const reconciliation = reconcileProposals(store.proposals, snapshot);
    store.proposals = reconciliation.proposals;

    store.snapshot = snapshot;
    store.snapshots = [...store.snapshots, snapshot].slice(-SNAPSHOT_HISTORY);

    return {
      snapshot,
      imported: result.imported,
      linked: result.linked,
      updated: result.updated,
      reconciled: reconciliation.settled.length,
    };
  });
}

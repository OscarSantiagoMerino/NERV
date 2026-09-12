import type { GitHubRef, Snapshot, Task } from "@/server/ai/mvp/types";
import {
  findIssueByMarker,
  GithubClientError,
  listIssues,
  type RawGithubIssue,
} from "./client";
import {
  finishProposal,
  listProposalsByStatus,
  listTasks,
  saveSnapshot,
  type DemoContextError,
} from "@/server/ai/mvp/tempStore";
import { proposalMarker } from "@/server/ai/mvp/specialist";

/**
 * Six issue numbers the demo project was seeded with. TEMPORARY: replace
 * with P2's real sixTasksSeed once published — this env var is a stand-in.
 */
function seededIssueNumbers(): number[] {
  const raw = process.env.GITHUB_DEMO_ISSUE_NUMBERS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function toGithubRef(repo: string, issue: RawGithubIssue): GitHubRef {
  return {
    repo,
    number: issue.number,
    url: issue.htmlUrl,
    state: issue.state,
    labels: issue.labels,
    updatedAt: issue.updatedAt,
  };
}

function toTask(repo: string, issue: RawGithubIssue, existing: Task | undefined): Task {
  return {
    id: existing?.id ?? `task_${repo}_${issue.number}`,
    title: issue.title,
    body: issue.body ?? "",
    milestoneId: existing?.milestoneId ?? "milestone_ready",
    ownerProfileId: existing?.ownerProfileId ?? null,
    workflowState: existing?.workflowState ?? "todo",
    github: toGithubRef(repo, issue),
    version: (existing?.version ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
}

/** POST /api/mvp/github/sync body — CONTRATOS.md §3/§5. */
export async function buildAndSaveSnapshot(repo: string): Promise<Snapshot> {
  const expectedNumbers = seededIssueNumbers();
  const limitations: string[] = [];
  let complete = true;
  let matched: RawGithubIssue[] = [];

  if (expectedNumbers.length === 0) {
    limitations.push("No seeded issue numbers configured (GITHUB_DEMO_ISSUE_NUMBERS).");
    complete = false;
  } else {
    try {
      const all = await listIssues(repo);
      const byNumber = new Map(all.map((issue) => [issue.number, issue]));
      matched = expectedNumbers
        .map((number) => byNumber.get(number))
        .filter((issue): issue is RawGithubIssue => !!issue && !issue.isPullRequest);

      if (matched.length < expectedNumbers.length) {
        complete = false;
        limitations.push(
          `Expected ${expectedNumbers.length} seeded issues, found ${matched.length}.`,
        );
      }
    } catch (error) {
      complete = false;
      limitations.push(
        error instanceof GithubClientError
          ? `GitHub read failed (${error.status}): ${error.message}`
          : `GitHub read failed: ${String(error)}`,
      );
    }
  }

  const existingTasks = new Map(listTasks().map((task) => [task.github.number, task]));
  const tasks = matched.map((issue) => toTask(repo, issue, existingTasks.get(issue.number)));

  const snapshot: Snapshot = {
    id: `snapshot_${Date.now()}`,
    fetchedAt: new Date().toISOString(),
    mode: "live",
    complete,
    issues: matched.map((issue) => toGithubRef(repo, issue)),
    limitations,
  };

  saveSnapshot(snapshot, tasks);

  await reconcilePendingProposals(repo);

  return snapshot;
}

/**
 * CONTRATOS.md §5: sync also reconciles executing/uncertain proposals by
 * searching for their marker in the repo, in case a prior write actually
 * succeeded but the response was never confirmed (timeout, crash).
 * Not finding it in a partial list is not proof it doesn't exist, so
 * unmatched proposals are simply left as-is for the next sync attempt.
 */
async function reconcilePendingProposals(repo: string): Promise<void> {
  const pending = listProposalsByStatus("executing", "uncertain");
  for (const proposal of pending) {
    const found = await findIssueByMarker(repo, proposalMarker(proposal.id));
    if (!found) continue;
    finishProposal(proposal.id, {
      status: "applied",
      result: { number: found.number, url: found.htmlUrl },
      newTask: toTask(repo, found, undefined),
    });
  }
}

export type { DemoContextError };

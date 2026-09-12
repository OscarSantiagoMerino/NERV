import type { GitHubRef, Snapshot } from "@/contracts/mvp";
import { getState, saveSnapshot, finishProposal } from "@/server/platform/mvp";
import { findIssueByMarker, GithubClientError, listIssues, type RawGithubIssue } from "./client";
import { proposalMarker } from "@/server/ai/mvp/specialist";

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

/**
 * Matches seeded tasks to live GitHub issues by exact title — the "stable
 * identity" CONTRATOS.md §1 asks for, since the fixture's placeholder issue
 * numbers (9001-9006) won't exist in the real repo. P3 (human) creates the
 * six real issues with matching titles in the authorized repo.
 */
export async function buildAndSaveSnapshot(repo: string): Promise<Snapshot> {
  const seedTasks = getState().tasks;
  const limitations: string[] = [];
  let complete = true;
  let liveIssues: RawGithubIssue[] = [];

  try {
    liveIssues = (await listIssues(repo)).filter((issue) => !issue.isPullRequest);
  } catch (error) {
    complete = false;
    limitations.push(
      error instanceof GithubClientError
        ? `GitHub read failed (${error.status}): ${error.message}`
        : `GitHub read failed: ${String(error)}`,
    );
  }

  const normalizedTasks: Array<{ taskId: string; github: GitHubRef }> = [];
  const matchedRefs: GitHubRef[] = [];

  for (const task of seedTasks) {
    const match = liveIssues.find((issue) => issue.title === task.title);
    if (!match) {
      complete = false;
      limitations.push(`No live issue titled "${task.title}" found in ${repo}.`);
      continue;
    }
    const ref = toGithubRef(repo, match);
    normalizedTasks.push({ taskId: task.id, github: ref });
    matchedRefs.push(ref);
  }

  const snapshot: Snapshot = {
    id: `snapshot_${Date.now()}`,
    fetchedAt: new Date().toISOString(),
    mode: "live",
    complete,
    issues: matchedRefs,
    limitations,
  };

  saveSnapshot(snapshot, normalizedTasks);
  await reconcilePendingProposals(repo);
  return snapshot;
}

/**
 * CONTRATOS.md §5: sync also reconciles executing/uncertain proposals by
 * searching for their marker in the repo, in case a prior write actually
 * succeeded but the response was never confirmed (timeout, crash). Not
 * finding it in a partial list is not proof it doesn't exist, so unmatched
 * proposals are simply left as-is for the next sync attempt.
 */
async function reconcilePendingProposals(repo: string): Promise<void> {
  const pending = getState().proposals.filter((p) => p.status === "executing" || p.status === "uncertain");
  for (const proposal of pending) {
    const found = await findIssueByMarker(repo, proposalMarker(proposal.id));
    if (!found) continue;
    finishProposal(proposal.id, {
      status: "applied",
      result: { number: found.number, url: found.htmlUrl },
      newTask: {
        id: `task_${repo}_${found.number}`,
        title: found.title,
        body: found.body ?? "",
        milestoneId: "ms-ready-for-validation",
        ownerProfileId: null,
        workflowState: "todo",
        github: toGithubRef(repo, found),
        version: 1,
        updatedAt: new Date().toISOString(),
      },
    });
  }
}

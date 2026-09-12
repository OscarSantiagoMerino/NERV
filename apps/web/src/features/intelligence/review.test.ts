import assert from "node:assert/strict";
import test from "node:test";
import type { GitHubRef, Proposal, Snapshot, Store, Task } from "@/contracts/schemas";
import { reconcileProposals, reconcileTasks } from "@/server/github/sync";
import { heuristicFinding } from "@/server/ai/risk-specialist";
import { evidenceDrift } from "./proposal-service";
import { seedStore } from "@/contracts/fixture";

const REPO = "acme/demo";

function issue(overrides: Partial<GitHubRef> & { number: number }): GitHubRef {
  return {
    repo: REPO,
    url: `https://github.com/${REPO}/issues/${overrides.number}`,
    title: `Issue ${overrides.number}`,
    state: "open",
    labels: [],
    body: "",
    updatedAt: "2026-09-12T10:00:00.000Z",
    ...overrides,
  };
}

function task(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    projectId: "p",
    origin: "manual",
    milestoneId: "ms-1",
    description: "",
    workflowState: "doing",
    responsibleId: null,
    dueAt: null,
    estimateMinutes: null,
    acceptanceCriteria: "",
    blocked: false,
    githubIssueNumber: null,
    githubUrl: null,
    githubState: null,
    githubLabels: [],
    githubUpdatedAt: null,
    version: 1,
    ...overrides,
  };
}

function snapshot(issues: GitHubRef[], overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    id: "snap-1",
    repo: REPO,
    fetchedAt: "2026-09-12T14:12:00.000Z",
    mode: "fixture",
    complete: true,
    issues,
    limitations: [],
    ...overrides,
  };
}

function proposal(overrides: Partial<Proposal> & { id: string }): Proposal {
  return {
    reviewId: "rev-1",
    version: 2,
    status: "executing",
    payload: { title: "t", body: "b" },
    rationale: "r",
    evidenceTaskIds: [],
    marker: `nerv-proposal:${overrides.id}`,
    createdAt: "2026-09-12T14:12:00.000Z",
    approvedAt: null,
    approvedByMemberId: null,
    result: null,
    error: null,
    ...overrides,
  };
}

const context = { projectId: "p", milestoneId: "ms-1" };

test("a sync links an issue to a task by title without touching the board column", () => {
  const local = task({ id: "t1", title: "Reclutar 5 usuarios de prueba", workflowState: "doing" });
  const { tasks, linked } = reconcileTasks(
    [local],
    [issue({ number: 14, title: "Reclutar 5 usuarios de prueba", state: "closed" })],
    context,
  );

  assert.equal(linked, 1);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].githubIssueNumber, 14);
  assert.equal(tasks[0].githubState, "closed");
  // GitHub's closed and NERV's Done are different facts.
  assert.equal(tasks[0].workflowState, "doing");
});

test("a `blocked` label raises the flag, and a later read without it does not clear it", () => {
  const first = reconcileTasks(
    [task({ id: "t1", title: "Prepare" })],
    [issue({ number: 9, title: "Prepare", labels: ["blocked"] })],
    context,
  );
  assert.equal(first.tasks[0].blocked, true);

  const second = reconcileTasks(
    first.tasks,
    [issue({ number: 9, title: "Prepare", labels: [] })],
    context,
  );
  assert.equal(second.tasks[0].blocked, true);
});

test("an issue with no local task is imported, and a task the read omits survives", () => {
  const kept = task({ id: "keep", title: "Not on GitHub" });
  const { tasks, imported } = reconcileTasks([kept], [issue({ number: 21 })], context);

  assert.equal(imported, 1);
  assert.equal(tasks.length, 2);
  assert.ok(tasks.some((item) => item.id === "keep"));
  const created = tasks.find((item) => item.githubIssueNumber === 21);
  assert.equal(created?.origin, "github");
  assert.equal(created?.workflowState, "todo");
  assert.equal(created?.responsibleId, null);
});

test("re-reading the same issues changes nothing and bumps no versions", () => {
  const issues = [issue({ number: 14, title: "Reclutar" })];
  const first = reconcileTasks([task({ id: "t1", title: "Reclutar" })], issues, context);
  const second = reconcileTasks(first.tasks, issues, context);

  assert.equal(second.imported, 0);
  assert.equal(second.updated, 0);
  assert.deepEqual(second.tasks, first.tasks);
});

test("an uncertain proposal is settled by finding its marker, not by assuming", () => {
  const pending = proposal({ id: "abc", status: "uncertain" });
  const found = snapshot([
    issue({ number: 31, body: "text\n\n<!-- nerv-proposal:abc -->" }),
  ]);

  const settled = reconcileProposals([pending], found);
  assert.equal(settled.proposals[0].status, "applied");
  assert.equal(settled.proposals[0].result?.number, 31);

  // Absent from this read is not proof it does not exist.
  const stillUnknown = reconcileProposals([pending], snapshot([issue({ number: 31 })]));
  assert.equal(stillUnknown.proposals[0].status, "uncertain");
  assert.equal(stillUnknown.settled.length, 0);
});

test("an executing proposal whose marker is absent becomes uncertain, never applied", () => {
  const inFlight = proposal({ id: "def", status: "executing" });
  const { proposals } = reconcileProposals([inFlight], snapshot([issue({ number: 5 })]));

  assert.equal(proposals[0].status, "uncertain");
  assert.equal(proposals[0].error?.code, "RESULT_UNKNOWN");
});

test("a settled proposal is never revisited by a sync", () => {
  const applied = proposal({
    id: "ghi",
    status: "applied",
    result: { repo: REPO, number: 7, url: "u" },
  });
  const rejected = proposal({ id: "jkl", status: "rejected" });
  const { proposals, settled } = reconcileProposals([applied, rejected], snapshot([]));

  assert.deepEqual(proposals, [applied, rejected]);
  assert.equal(settled.length, 0);
});

test("evidence that moved since the review blocks approval", () => {
  const original = snapshot([issue({ number: 14, updatedAt: "2026-09-12T13:58:00.000Z" })]);

  assert.deepEqual(evidenceDrift(original, [14], original.issues), []);

  const edited = evidenceDrift(original, [14], [
    issue({ number: 14, updatedAt: "2026-09-12T15:10:00.000Z" }),
  ]);
  assert.equal(edited.length, 1);

  const gone = evidenceDrift(original, [14], []);
  assert.equal(gone.length, 1);

  const moved = evidenceDrift(original, [14], [issue({ number: 14, repo: "other/repo" })]);
  assert.equal(moved.length, 1);
});

test("the rule-based reading cites a blocked task and proposes one mitigation", () => {
  const store: Store = {
    ...seedStore,
    tasks: seedStore.tasks.map((item) =>
      item.blocked ? { ...item, githubIssueNumber: 14, githubState: "open" } : item,
    ),
  };
  const finding = heuristicFinding(store, snapshot([issue({ number: 14 })]));

  assert.deepEqual(finding.evidenceIssueNumbers, [14]);
  assert.ok(finding.proposal !== null);
  // The marker is added when the proposal is persisted, never by the reading.
  assert.ok(!finding.proposal.body.includes("nerv-proposal:"));
  assert.ok(finding.limitations.length > 0);
});

test("with nothing flagged or overdue the reading proposes nothing", () => {
  const clear: Store = {
    ...seedStore,
    tasks: seedStore.tasks.map((item) => ({ ...item, blocked: false, dueAt: null })),
  };
  const finding = heuristicFinding(clear, snapshot([]));

  assert.equal(finding.proposal, null);
  assert.ok(finding.limitations.some((line) => line.includes("nobody recorded")));
});

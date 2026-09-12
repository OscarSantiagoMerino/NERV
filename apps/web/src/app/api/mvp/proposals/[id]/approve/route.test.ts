import { test, describe, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Must be set before any of these modules are first imported.
const tempDir = mkdtempSync(join(tmpdir(), "nerv-approve-test-"));
process.env.NERV_DB_PATH = join(tempDir, "test.sqlite");
process.env.GITHUB_TOKEN = "test-token";
process.env.GITHUB_REPO = "o/r";

const ORIGINAL_FETCH = global.fetch;

function githubRequest(body: unknown) {
  return new Request("http://127.0.0.1:3100/api/mvp/proposals/x/approve", {
    method: "POST",
    headers: {
      Host: "127.0.0.1:3100",
      Origin: "http://127.0.0.1:3100",
      "X-Nerv-Demo": "1",
      "X-Nerv-Profile": "profile-lead",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("approve/reject — concurrency and error paths", () => {
  let POST_approve: typeof import("./route").POST;
  let POST_reject: typeof import("../reject/route").POST;
  let getState: typeof import("@/server/platform/mvp").getState;
  let saveSnapshot: typeof import("@/server/platform/mvp").saveSnapshot;
  let saveReviewAndProposal: typeof import("@/server/platform/mvp").saveReviewAndProposal;
  let createIssueCalls: number;

  before(async () => {
    ({ POST: POST_approve } = await import("./route"));
    ({ POST: POST_reject } = await import("../reject/route"));
    ({ getState, saveSnapshot, saveReviewAndProposal } = await import("@/server/platform/mvp"));
  });

  after(() => {
    global.fetch = ORIGINAL_FETCH;
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // better-sqlite3 keeps the file open on Windows — best-effort only.
    }
  });

  function seedPendingProposal(evidenceTaskId?: string) {
    const state = getState();
    const task = evidenceTaskId ? state.tasks.find((t) => t.id === evidenceTaskId) : undefined;

    // A real `mode: 'live'` snapshot — the seed's own snapshot is
    // `mode: 'fixture'`, which approve correctly refuses to act on.
    const snapshotId = `snapshot_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    saveSnapshot(
      {
        id: snapshotId,
        fetchedAt: new Date().toISOString(),
        mode: "live",
        complete: true,
        issues: task ? [task.github] : [],
        limitations: [],
      },
      task ? [{ taskId: task.id, github: task.github }] : [],
    );

    const reviewId = `review_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const proposalId = `proposal_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    saveReviewAndProposal(
      {
        id: reviewId,
        goalImpact: "test",
        summary: "test",
        evidenceTaskIds: task ? [task.id] : [],
        snapshotId,
        limitations: [],
        proposalId,
        createdAt: new Date().toISOString(),
      },
      {
        id: proposalId,
        reviewId,
        version: 1,
        status: "pending",
        payload: { title: "Test proposal", body: "Test body" },
        rationale: "test",
        evidenceTaskIds: task ? [task.id] : [],
        createdAt: new Date().toISOString(),
        approvedAt: null,
        approvedByDemoProfileId: null,
        result: null,
        ambiguous: null,
        ambiguousError: null,
        error: null,
      },
    );
    return proposalId;
  }

  beforeEach(() => {
    createIssueCalls = 0;
  });

  function mockGithubSuccess() {
    global.fetch = (async (url: string | URL) => {
      const path = url.toString();
      if (path.includes("/issues") && !path.includes("issues?")) {
        createIssueCalls += 1;
        return new Response(
          JSON.stringify({
            number: 42,
            title: "Test proposal",
            body: "Test body",
            state: "open",
            labels: [],
            html_url: "https://github.com/o/r/issues/42",
            updated_at: "2026-09-12T21:00:00.000Z",
          }),
          { status: 201 },
        );
      }
      return new Response("[]", { status: 200 });
    }) as typeof fetch;
  }

  function mockGithubNetworkFailure() {
    global.fetch = (async () => {
      createIssueCalls += 1;
      throw new TypeError("network error");
    }) as typeof fetch;
  }

  test("reject: pending proposal is rejected without calling GitHub", async () => {
    mockGithubSuccess();
    const id = seedPendingProposal();
    const response = await POST_reject(githubRequest({ expectedVersion: 1 }), {
      params: Promise.resolve({ id }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.status, "rejected");
    assert.equal(createIssueCalls, 0);
  });

  test("reject: already-rejected proposal returns 409, not a silent success", async () => {
    mockGithubSuccess();
    const id = seedPendingProposal();
    await POST_reject(githubRequest({ expectedVersion: 1 }), { params: Promise.resolve({ id }) });
    const second = await POST_reject(githubRequest({ expectedVersion: 2 }), { params: Promise.resolve({ id }) });

    assert.equal(second.status, 409);
  });

  test("approve: success creates exactly one real issue and a new task", async () => {
    mockGithubSuccess();
    const id = seedPendingProposal();
    const response = await POST_approve(githubRequest({ expectedVersion: 1 }), {
      params: Promise.resolve({ id }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.status, "applied");
    assert.equal(body.data.result.number, 42);
    assert.equal(createIssueCalls, 1);
    assert.ok(getState().tasks.some((t) => t.github.number === 42));
  });

  test("approve: double-click (two sequential requests) never creates a second issue", async () => {
    mockGithubSuccess();
    const id = seedPendingProposal();
    const first = await POST_approve(githubRequest({ expectedVersion: 1 }), { params: Promise.resolve({ id }) });
    const second = await POST_approve(githubRequest({ expectedVersion: 1 }), { params: Promise.resolve({ id }) });

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(createIssueCalls, 1, "createIssue must be called exactly once across both requests");
    const secondBody = await second.json();
    assert.equal(secondBody.data.status, "applied");
  });

  test("approve: network failure marks the proposal uncertain, no automatic retry", async () => {
    mockGithubNetworkFailure();
    const id = seedPendingProposal();
    const response = await POST_approve(githubRequest({ expectedVersion: 1 }), {
      params: Promise.resolve({ id }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.status, "uncertain");
    assert.equal(createIssueCalls, 1);

    // A second approve call on an uncertain (non-pending) proposal must not
    // attempt another GitHub write.
    const retry = await POST_approve(githubRequest({ expectedVersion: body.data.version }), {
      params: Promise.resolve({ id }),
    });
    const retryBody = await retry.json();
    assert.equal(retryBody.data.status, "uncertain");
    assert.equal(createIssueCalls, 1, "must not retry the write automatically");
  });

  test("approve: stale evidence (issue changed since review) is rejected with 409", async () => {
    mockGithubSuccess();
    const state = getState();
    const taskWithEvidence = state.tasks[0];
    const id = seedPendingProposal(taskWithEvidence.id);

    // The cited issue's updatedAt in live GitHub no longer matches what
    // the review saw — getIssue below returns a different updated_at.
    global.fetch = (async (url: string | URL) => {
      const path = url.toString();
      if (path.match(/\/issues\/\d+$/)) {
        return new Response(
          JSON.stringify({
            number: taskWithEvidence.github.number,
            title: taskWithEvidence.title,
            body: null,
            state: "open",
            labels: [],
            html_url: taskWithEvidence.github.url,
            updated_at: "2099-01-01T00:00:00.000Z", // changed
          }),
          { status: 200 },
        );
      }
      return new Response("[]", { status: 200 });
    }) as typeof fetch;

    const response = await POST_approve(githubRequest({ expectedVersion: 1 }), {
      params: Promise.resolve({ id }),
    });
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.equal(body.error.code, "EVIDENCE_CHANGED");
    assert.equal(createIssueCalls, 0);
  });
});

import { randomUUID } from "node:crypto";
import { db } from "./db";
import { demoProject, demoProfiles } from "@/contracts/mvp/demo-fixture";
import {
  DemoStateSchema,
  TaskSchema,
  MessageSchema,
  SnapshotSchema,
  ReviewSchema,
  ProposalSchema,
  type DemoState,
  type DemoContext,
  type Task,
  type WorkflowState,
  type Message,
  type Snapshot,
  type Review,
  type Proposal,
  type ProposalOutcome,
  type GitHubRef,
} from "@/contracts/mvp";

// Public exports per docs/mvp/CONTRATOS.md §4. Only P2 writes this file;
// P1/P3 call these functions rather than touching `db` or SQL directly.

export class DemoError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryable = false,
  ) {
    super(message);
  }
}

function isLoopbackHost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0];
  return hostname === "127.0.0.1" || hostname === "localhost";
}

const CONFIGURED_ORIGIN = process.env.PUBLIC_APP_ORIGIN ?? "http://127.0.0.1:3100";

/**
 * Validates Host, `X-Nerv-Demo: 1`, and (for mutations) an exact Origin
 * match, then resolves the demo profile from `X-Nerv-Profile`. `/session`
 * is the only caller that passes `requireProfile: false` — it's the entry
 * point before a profile is chosen. This does not authenticate a person;
 * it only attributes demo actions to a chosen profile. See CONTRATOS.md §3.
 */
export function getDemoContext(
  request: Request,
  opts: { requireProfile?: boolean; requireOrigin?: boolean } = {},
): DemoContext {
  const { requireProfile = true, requireOrigin = false } = opts;

  if (!isLoopbackHost(request.headers.get("host"))) {
    throw new DemoError(403, "INVALID_HOST", "This demo only runs on loopback.");
  }
  if (request.headers.get("x-nerv-demo") !== "1") {
    throw new DemoError(403, "MISSING_DEMO_HEADER", "Missing X-Nerv-Demo: 1 header.");
  }
  if (requireOrigin) {
    const origin = request.headers.get("origin");
    if (origin !== CONFIGURED_ORIGIN) {
      throw new DemoError(403, "INVALID_ORIGIN", "Origin does not match the configured app origin.");
    }
  }

  let profileId = "";
  if (requireProfile) {
    const header = request.headers.get("x-nerv-profile");
    if (!header) {
      throw new DemoError(401, "MISSING_PROFILE", "Missing X-Nerv-Profile header.");
    }
    if (!demoProfiles.some((p) => p.id === header)) {
      throw new DemoError(403, "UNKNOWN_PROFILE", `Unknown profile '${header}'.`);
    }
    profileId = header;
  }

  return { projectId: demoProject.id, repo: demoProject.repo, profileId };
}

function logEvent(type: string, entityId: string, payload: unknown): void {
  db.prepare("INSERT INTO events (type, entity_id, created_at, payload) VALUES (?, ?, ?, ?)").run(
    type,
    entityId,
    new Date().toISOString(),
    JSON.stringify(payload),
  );
}

function readTask(id: string): { row: { data: string; version: number }; task: Task } | null {
  const row = db.prepare("SELECT data, version FROM tasks WHERE id = ?").get(id) as
    | { data: string; version: number }
    | undefined;
  if (!row) return null;
  return { row, task: TaskSchema.parse(JSON.parse(row.data)) };
}

function writeTask(task: Task): void {
  db.prepare(
    "UPDATE tasks SET workflow_state=@workflow_state, version=@version, updated_at=@updated_at, data=@data WHERE id=@id",
  ).run({
    id: task.id,
    workflow_state: task.workflowState,
    version: task.version,
    updated_at: task.updatedAt,
    data: JSON.stringify(task),
  });
}

export function getState(): DemoState {
  const tasks = (db.prepare("SELECT data FROM tasks ORDER BY id").all() as { data: string }[]).map((r) =>
    TaskSchema.parse(JSON.parse(r.data)),
  );
  const messages = (db.prepare("SELECT data FROM messages ORDER BY created_at").all() as { data: string }[]).map(
    (r) => MessageSchema.parse(JSON.parse(r.data)),
  );
  const snapshotRow = db.prepare("SELECT data FROM snapshots ORDER BY fetched_at DESC LIMIT 1").get() as
    | { data: string }
    | undefined;
  const snapshot = snapshotRow ? SnapshotSchema.parse(JSON.parse(snapshotRow.data)) : null;
  const reviews = (db.prepare("SELECT data FROM reviews ORDER BY created_at").all() as { data: string }[]).map((r) =>
    ReviewSchema.parse(JSON.parse(r.data)),
  );
  const proposals = (db.prepare("SELECT data FROM proposals ORDER BY rowid").all() as { data: string }[]).map((r) =>
    ProposalSchema.parse(JSON.parse(r.data)),
  );

  return DemoStateSchema.parse({
    demoMode: true,
    project: demoProject,
    profiles: demoProfiles,
    tasks,
    messages,
    snapshot,
    reviews,
    proposals,
  });
}

export function getSnapshot(id: string): Snapshot | null {
  const row = db.prepare("SELECT data FROM snapshots WHERE id = ?").get(id) as { data: string } | undefined;
  return row ? SnapshotSchema.parse(JSON.parse(row.data)) : null;
}

export function updateTask(
  id: string,
  workflowState: WorkflowState,
  expectedVersion: number,
  context: DemoContext,
): Task {
  const run = db.transaction((): Task => {
    const found = readTask(id);
    if (!found) throw new DemoError(404, "NOT_FOUND", `No task with id '${id}'.`);
    if (found.task.version !== expectedVersion) {
      throw new DemoError(409, "VERSION_CONFLICT", "Task changed since you last read it.", true);
    }
    const next: Task = {
      ...found.task,
      workflowState,
      version: found.task.version + 1,
      updatedAt: new Date().toISOString(),
    };
    writeTask(next);
    logEvent("task.workflowState", id, { by: context.profileId, from: found.task.workflowState, to: workflowState });
    return next;
  });
  return run();
}

export function appendMessage(text: string, context: DemoContext): Message {
  const message: Message = {
    id: randomUUID(),
    profileId: context.profileId,
    text,
    createdAt: new Date().toISOString(),
  };
  MessageSchema.parse(message);
  db.prepare("INSERT INTO messages (id, created_at, data) VALUES (@id, @created_at, @data)").run({
    id: message.id,
    created_at: message.createdAt,
    data: JSON.stringify(message),
  });
  logEvent("message.append", message.id, { by: context.profileId });
  return message;
}

/**
 * Persists a fresh GitHub snapshot and merges `github` refs into matching
 * tasks (matched by id, resolved upstream by P3 via repo+number). Never
 * touches `workflowState` — NERV's Kanban column and GitHub open/closed
 * are deliberately separate, per CONTRATOS.md §4.
 */
export function saveSnapshot(snapshot: Snapshot, normalizedTasks: Array<{ taskId: string; github: GitHubRef }>): Snapshot {
  const run = db.transaction((): Snapshot => {
    SnapshotSchema.parse(snapshot);
    db.prepare("INSERT INTO snapshots (id, fetched_at, data) VALUES (@id, @fetched_at, @data)").run({
      id: snapshot.id,
      fetched_at: snapshot.fetchedAt,
      data: JSON.stringify(snapshot),
    });
    for (const { taskId, github } of normalizedTasks) {
      const found = readTask(taskId);
      if (!found) continue; // Unknown task id: skip rather than fabricate one.
      writeTask({ ...found.task, github, version: found.task.version + 1, updatedAt: new Date().toISOString() });
    }
    logEvent("github.sync", snapshot.id, { mode: snapshot.mode, complete: snapshot.complete, updated: normalizedTasks.length });
    return snapshot;
  });
  return run();
}

export function saveReviewAndProposal(review: Review, proposal: Proposal | null): Review {
  const run = db.transaction((): Review => {
    ReviewSchema.parse(review);
    if (proposal) ProposalSchema.parse(proposal);
    db.prepare(
      "INSERT INTO reviews (id, snapshot_id, proposal_id, created_at, data) VALUES (@id, @snapshot_id, @proposal_id, @created_at, @data)",
    ).run({
      id: review.id,
      snapshot_id: review.snapshotId,
      proposal_id: review.proposalId,
      created_at: review.createdAt,
      data: JSON.stringify(review),
    });
    if (proposal) {
      db.prepare(
        "INSERT INTO proposals (id, review_id, status, version, data) VALUES (@id, @review_id, @status, @version, @data)",
      ).run({
        id: proposal.id,
        review_id: proposal.reviewId,
        status: proposal.status,
        version: proposal.version,
        data: JSON.stringify(proposal),
      });
    }
    logEvent("review.create", review.id, { proposalId: review.proposalId });
    return review;
  });
  return run();
}

function readProposal(id: string): Proposal {
  const row = db.prepare("SELECT data FROM proposals WHERE id = ?").get(id) as { data: string } | undefined;
  if (!row) throw new DemoError(404, "NOT_FOUND", `No proposal with id '${id}'.`);
  return ProposalSchema.parse(JSON.parse(row.data));
}

function writeProposal(proposal: Proposal): void {
  db.prepare("UPDATE proposals SET status=@status, version=@version, data=@data WHERE id=@id").run({
    id: proposal.id,
    status: proposal.status,
    version: proposal.version,
    data: JSON.stringify(proposal),
  });
}

/** Exactly one caller gets `claimed: true` for a given pending→executing transition. */
export function claimProposal(
  id: string,
  expectedVersion: number,
  context: DemoContext,
): { claimed: boolean; proposal: Proposal } {
  const run = db.transaction((): { claimed: boolean; proposal: Proposal } => {
    const current = readProposal(id);
    if (current.status !== "pending") {
      return { claimed: false, proposal: current };
    }
    if (current.version !== expectedVersion) {
      throw new DemoError(409, "VERSION_CONFLICT", "Proposal changed since you last read it.", true);
    }
    const next: Proposal = {
      ...current,
      status: "executing",
      version: current.version + 1,
      approvedAt: new Date().toISOString(),
      approvedByDemoProfileId: context.profileId,
    };
    writeProposal(next);
    logEvent("proposal.claim", id, { by: context.profileId });
    return { claimed: true, proposal: next };
  });
  return run();
}

export function rejectProposal(id: string, expectedVersion: number, context: DemoContext): Proposal {
  const run = db.transaction((): Proposal => {
    const current = readProposal(id);
    if (current.status !== "pending") {
      throw new DemoError(409, "NOT_PENDING", `Proposal is '${current.status}', not pending.`);
    }
    if (current.version !== expectedVersion) {
      throw new DemoError(409, "VERSION_CONFLICT", "Proposal changed since you last read it.", true);
    }
    const next: Proposal = {
      ...current,
      status: "rejected",
      version: current.version + 1,
      approvedByDemoProfileId: context.profileId,
    };
    writeProposal(next);
    logEvent("proposal.reject", id, { by: context.profileId });
    return next;
  });
  return run();
}

/** `finishProposal('applied', ...)` inserts/updates the resulting Task by repo+number, atomically with the proposal write. */
export function finishProposal(id: string, outcome: ProposalOutcome): Proposal {
  const run = db.transaction((): Proposal => {
    const current = readProposal(id);
    let next: Proposal;

    if (outcome.status === "applied") {
      next = {
        ...current,
        status: "applied",
        version: current.version + 1,
        result: outcome.result,
        error: null,
        // Adenda Ambiguous (CONTRATOS.md §10): never affects `status` — a
        // failed/omitted Ambiguous export still leaves the proposal `applied`
        // because GitHub is the action the acceptance criteria checks.
        ambiguous: outcome.ambiguous ?? null,
        ambiguousError: outcome.ambiguousError ?? null,
      };
      const existing = db
        .prepare(
          "SELECT id FROM tasks WHERE json_extract(data,'$.github.repo') = ? AND json_extract(data,'$.github.number') = ?",
        )
        .get(outcome.newTask.github.repo, outcome.newTask.github.number) as { id: string } | undefined;
      if (existing) {
        const found = readTask(existing.id)!;
        writeTask({ ...found.task, github: outcome.newTask.github, version: found.task.version + 1, updatedAt: new Date().toISOString() });
      } else {
        TaskSchema.parse(outcome.newTask);
        db.prepare(
          "INSERT INTO tasks (id, workflow_state, version, updated_at, data) VALUES (@id, @workflow_state, @version, @updated_at, @data)",
        ).run({
          id: outcome.newTask.id,
          workflow_state: outcome.newTask.workflowState,
          version: outcome.newTask.version,
          updated_at: outcome.newTask.updatedAt,
          data: JSON.stringify(outcome.newTask),
        });
      }
    } else {
      next = { ...current, status: outcome.status, version: current.version + 1, error: outcome.error };
    }
    writeProposal(next);
    logEvent("proposal.finish", id, { status: next.status });
    return next;
  });
  return run();
}

import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createFixtureSnapshot } from "../fixture";
import type { Message, Task, WorkspaceSnapshot } from "../types";

const storeFile = path.join(
  process.env.NERV_DATA_DIR ?? path.join(process.cwd(), ".data"),
  "workspace.json",
);

// Writes are serialised through one chain because the store is a single JSON
// file: two concurrent read-modify-write cycles would otherwise lose one edit.
let queue: Promise<unknown> = Promise.resolve();

function serialised<T>(operation: () => Promise<T>): Promise<T> {
  const run = queue.then(operation, operation);
  queue = run.catch(() => undefined);
  return run;
}

async function persist(snapshot: WorkspaceSnapshot): Promise<void> {
  await fs.mkdir(path.dirname(storeFile), { recursive: true });
  await fs.writeFile(storeFile, JSON.stringify(snapshot, null, 2), "utf8");
}

async function load(): Promise<WorkspaceSnapshot> {
  try {
    return JSON.parse(await fs.readFile(storeFile, "utf8")) as WorkspaceSnapshot;
  } catch {
    const seeded = createFixtureSnapshot();
    await persist(seeded);
    return seeded;
  }
}

export function readSnapshot(): Promise<WorkspaceSnapshot> {
  return serialised(load);
}

export class StoreError extends Error {
  constructor(
    readonly code: "not_found" | "version_conflict" | "invalid_reference",
    message: string,
  ) {
    super(message);
  }
}

function assertMember(snapshot: WorkspaceSnapshot, memberId: string | null): void {
  if (memberId === null) return;
  if (!snapshot.members.some((member) => member.id === memberId)) {
    throw new StoreError("invalid_reference", "That member is not part of this project.");
  }
}

function assertMilestone(snapshot: WorkspaceSnapshot, milestoneId: string | null): void {
  if (milestoneId === null) return;
  if (!snapshot.project.milestones.some((milestone) => milestone.id === milestoneId)) {
    throw new StoreError("invalid_reference", "That milestone is not part of this project.");
  }
}

export type NewTask = {
  title: string;
  description: string;
  acceptanceCriteria: string;
  milestoneId: string | null;
  responsibleId: string | null;
  dueAt: string | null;
  estimateMinutes: number | null;
};

export function createTask(input: NewTask): Promise<Task> {
  return serialised(async () => {
    const snapshot = await load();
    assertMember(snapshot, input.responsibleId);
    assertMilestone(snapshot, input.milestoneId);

    const task: Task = {
      id: randomUUID(),
      projectId: snapshot.project.id,
      origin: "manual",
      milestoneId: input.milestoneId,
      title: input.title,
      description: input.description,
      workflowState: "todo",
      responsibleId: input.responsibleId,
      dueAt: input.dueAt,
      estimateMinutes: input.estimateMinutes,
      acceptanceCriteria: input.acceptanceCriteria,
      blocked: false,
      githubIssueNumber: null,
      githubUrl: null,
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    snapshot.tasks.push(task);
    await persist(snapshot);
    return task;
  });
}

export type TaskPatch = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "acceptanceCriteria"
    | "workflowState"
    | "responsibleId"
    | "milestoneId"
    | "dueAt"
    | "estimateMinutes"
    | "blocked"
  >
>;

export function updateTask(
  taskId: string,
  patch: TaskPatch,
  expectedVersion: number,
): Promise<Task> {
  return serialised(async () => {
    const snapshot = await load();
    const index = snapshot.tasks.findIndex((task) => task.id === taskId);
    if (index === -1) {
      throw new StoreError("not_found", "That task no longer exists.");
    }

    const current = snapshot.tasks[index];
    if (current.version !== expectedVersion) {
      throw new StoreError(
        "version_conflict",
        "The project changed; review the latest version.",
      );
    }

    if (patch.responsibleId !== undefined) assertMember(snapshot, patch.responsibleId);
    if (patch.milestoneId !== undefined) assertMilestone(snapshot, patch.milestoneId);

    const updated: Task = {
      ...current,
      ...patch,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };

    snapshot.tasks[index] = updated;
    await persist(snapshot);
    return updated;
  });
}

export function appendMessage(authorMemberId: string, text: string): Promise<Message> {
  return serialised(async () => {
    const snapshot = await load();
    assertMember(snapshot, authorMemberId);

    const message: Message = {
      id: randomUUID(),
      projectId: snapshot.project.id,
      authorMemberId,
      text,
      createdAt: new Date().toISOString(),
    };

    snapshot.messages.push(message);
    await persist(snapshot);
    return message;
  });
}

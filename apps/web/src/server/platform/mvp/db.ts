import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { seedDemoState } from "@/contracts/mvp/demo-fixture";

// Per docs/mvp/CONTRATOS.md §4/§5: one local SQLite file, outside public
// dirs, excluded from Git (.sqlite/-wal/-shm), one shared connection with
// prepared statements and short transactions. Idempotent seed: never wipe
// messages/proposals on restart.

const DB_PATH = process.env.NERV_DB_PATH ?? "data/nerv-demo.sqlite";

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    workflow_state TEXT NOT NULL,
    version INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY,
    fetched_at TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT NOT NULL,
    proposal_id TEXT,
    created_at TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    status TEXT NOT NULL,
    version INTEGER NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_workflow_state ON tasks(workflow_state);
  CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
`);

function isSeeded(): boolean {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'seeded'").get() as
    | { value: string }
    | undefined;
  return row?.value === "1";
}

function seed(): void {
  const insertTask = db.prepare(
    "INSERT INTO tasks (id, workflow_state, version, updated_at, data) VALUES (@id, @workflow_state, @version, @updated_at, @data)",
  );
  const insertMessage = db.prepare(
    "INSERT INTO messages (id, created_at, data) VALUES (@id, @created_at, @data)",
  );
  const insertSnapshot = db.prepare(
    "INSERT INTO snapshots (id, fetched_at, data) VALUES (@id, @fetched_at, @data)",
  );

  const run = db.transaction(() => {
    for (const task of seedDemoState.tasks) {
      insertTask.run({
        id: task.id,
        workflow_state: task.workflowState,
        version: task.version,
        updated_at: task.updatedAt,
        data: JSON.stringify(task),
      });
    }
    for (const message of seedDemoState.messages) {
      insertMessage.run({ id: message.id, created_at: message.createdAt, data: JSON.stringify(message) });
    }
    if (seedDemoState.snapshot) {
      insertSnapshot.run({
        id: seedDemoState.snapshot.id,
        fetched_at: seedDemoState.snapshot.fetchedAt,
        data: JSON.stringify(seedDemoState.snapshot),
      });
    }
    db.prepare("INSERT INTO meta (key, value) VALUES ('seeded', '1')").run();
  });
  run();
}

if (!isSeeded()) {
  seed();
}

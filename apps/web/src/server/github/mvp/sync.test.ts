import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// NERV_DB_PATH must be set before the store module is first imported,
// so this test gets its own throwaway SQLite file instead of the shared
// demo database.
const tempDir = mkdtempSync(join(tmpdir(), "nerv-sync-test-"));
process.env.NERV_DB_PATH = join(tempDir, "test.sqlite");
process.env.GITHUB_TOKEN = "test-token";

const ORIGINAL_FETCH = global.fetch;

function mockFetch(items: unknown[]) {
  global.fetch = (async () => new Response(JSON.stringify(items), { status: 200 })) as typeof fetch;
}

describe("buildAndSaveSnapshot (against a real, temp SQLite store)", () => {
  let buildAndSaveSnapshot: typeof import("./sync").buildAndSaveSnapshot;
  let getState: typeof import("@/server/platform/mvp").getState;

  before(async () => {
    ({ buildAndSaveSnapshot } = await import("./sync"));
    ({ getState } = await import("@/server/platform/mvp"));
  });

  after(() => {
    global.fetch = ORIGINAL_FETCH;
    // better-sqlite3 keeps its file handle open for the process lifetime
    // (module-level singleton, no close() exposed) — on Windows that keeps
    // the temp dir locked. Best-effort cleanup; a leftover temp dir isn't
    // a test failure.
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test("matches seeded tasks to live issues by title and updates their github refs", async () => {
    const seeded = getState().tasks;
    assert.ok(seeded.length > 0, "expected the real seed to have tasks");

    mockFetch(
      seeded.map((task, index) => ({
        number: 100 + index,
        title: task.title,
        body: "live body",
        state: "open",
        labels: ["nerv-demo"],
        html_url: `https://github.com/o/r/issues/${100 + index}`,
        updated_at: "2026-09-12T20:00:00.000Z",
      })),
    );

    const snapshot = await buildAndSaveSnapshot("o/r");

    assert.equal(snapshot.complete, true);
    assert.equal(snapshot.issues.length, seeded.length);

    const refreshed = getState().tasks;
    for (const task of refreshed) {
      assert.equal(task.github.repo, "o/r");
      assert.notEqual(task.github.number, undefined);
    }
  });

  test("flags incomplete when a seeded task's title has no live match", async () => {
    mockFetch([
      {
        number: 1,
        title: "Something unrelated",
        body: null,
        state: "open",
        labels: [],
        html_url: "u1",
        updated_at: "t1",
      },
    ]);

    const snapshot = await buildAndSaveSnapshot("o/r");

    assert.equal(snapshot.complete, false);
    assert.ok(snapshot.limitations.length > 0);
  });

  test("excludes pull requests from matching", async () => {
    const seeded = getState().tasks;
    mockFetch([
      {
        number: 999,
        title: seeded[0].title,
        body: null,
        state: "open",
        labels: [],
        html_url: "u",
        updated_at: "t",
        pull_request: {},
      },
    ]);

    const snapshot = await buildAndSaveSnapshot("o/r");

    assert.equal(snapshot.issues.length, 0);
    assert.equal(snapshot.complete, false);
  });
});

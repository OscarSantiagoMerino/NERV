import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { buildAndSaveSnapshot } from "./sync";

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_ENV = { ...process.env };

function mockFetch(items: unknown[]) {
  global.fetch = (async () => new Response(JSON.stringify(items), { status: 200 })) as typeof fetch;
}

describe("buildAndSaveSnapshot", () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN = "test-token";
    process.env.GITHUB_DEMO_ISSUE_NUMBERS = "1,2";
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    process.env = { ...ORIGINAL_ENV };
  });

  test("matches only the seeded issue numbers and excludes PRs", async () => {
    mockFetch([
      { number: 1, title: "Seeded A", body: "body a", state: "open", labels: [], html_url: "u1", updated_at: "t1" },
      { number: 2, title: "Seeded B", body: "body b", state: "open", labels: ["blocked"], html_url: "u2", updated_at: "t2" },
      { number: 3, title: "Not seeded", body: null, state: "open", labels: [], html_url: "u3", updated_at: "t3" },
      { number: 4, title: "A PR", body: null, state: "open", labels: [], html_url: "u4", updated_at: "t4", pull_request: {} },
    ]);

    const snapshot = await buildAndSaveSnapshot("o/r");

    assert.equal(snapshot.complete, true);
    assert.equal(snapshot.issues.length, 2);
    assert.deepEqual(snapshot.issues.map((i) => i.number).sort(), [1, 2]);
  });

  test("flags incomplete when fewer seeded issues are found than expected", async () => {
    mockFetch([
      { number: 1, title: "Seeded A", body: null, state: "open", labels: [], html_url: "u1", updated_at: "t1" },
    ]);

    const snapshot = await buildAndSaveSnapshot("o/r");

    assert.equal(snapshot.complete, false);
    assert.match(snapshot.limitations[0], /Expected 2/);
  });

  test("is incomplete with no network call when no seed is configured", async () => {
    delete process.env.GITHUB_DEMO_ISSUE_NUMBERS;
    let fetchCalled = false;
    global.fetch = (async () => {
      fetchCalled = true;
      return new Response("[]");
    }) as typeof fetch;

    const snapshot = await buildAndSaveSnapshot("o/r");

    assert.equal(snapshot.complete, false);
    assert.equal(fetchCalled, false);
  });
});

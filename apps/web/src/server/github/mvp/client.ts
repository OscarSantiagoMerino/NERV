/**
 * Thin GitHub REST wrapper — classic PAT (repo scope), no extra dependency.
 * Owner: P3 (docs/mvp/CONTRATOS.md §1, src/server/github/mvp/).
 */

export interface RawGithubIssue {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  labels: string[];
  htmlUrl: string;
  updatedAt: string;
  isPullRequest: boolean;
}

export class GithubClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GithubClientError";
  }
}

function githubToken(): string {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new GithubClientError("GITHUB_TOKEN is not configured", 500);
  }
  return token;
}

async function githubFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${githubToken()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new GithubClientError(
      `GitHub ${init?.method ?? "GET"} ${path} failed: ${response.status} ${body}`,
      response.status,
    );
  }
  return response;
}

function normalize(item: {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  labels: Array<{ name: string } | string>;
  html_url: string;
  updated_at: string;
  pull_request?: unknown;
}): RawGithubIssue {
  return {
    number: item.number,
    title: item.title,
    body: item.body,
    state: item.state,
    labels: item.labels.map((label) => (typeof label === "string" ? label : label.name)),
    htmlUrl: item.html_url,
    updatedAt: item.updated_at,
    isPullRequest: Boolean(item.pull_request),
  };
}

/** repo as "owner/name". Includes pull requests — callers filter them out. */
export async function listIssues(repo: string): Promise<RawGithubIssue[]> {
  const response = await githubFetch(`/repos/${repo}/issues?state=all&per_page=100`);
  const raw = (await response.json()) as Parameters<typeof normalize>[0][];
  return raw.map(normalize);
}

export async function getIssue(repo: string, number: number): Promise<RawGithubIssue> {
  const response = await githubFetch(`/repos/${repo}/issues/${number}`);
  const raw = (await response.json()) as Parameters<typeof normalize>[0];
  return normalize(raw);
}

/** Finds an open issue whose body contains the given proposal marker, for reconciliation. */
export async function findIssueByMarker(repo: string, marker: string): Promise<RawGithubIssue | null> {
  const issues = await listIssues(repo);
  return issues.find((issue) => !issue.isPullRequest && issue.body?.includes(marker)) ?? null;
}

export async function createIssue(
  repo: string,
  input: { title: string; body: string },
): Promise<RawGithubIssue> {
  const response = await githubFetch(`/repos/${repo}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: input.title, body: input.body }),
  });
  const raw = (await response.json()) as Parameters<typeof normalize>[0];
  return normalize(raw);
}

/**
 * docs/mvp/CONTRATOS.md §10 (Ambiguous addendum, authorized 2026-09-12).
 * Called only AFTER the GitHub issue is confirmed created, never before or
 * in parallel — a failure here must never compete with or block the write
 * that the acceptance criteria actually checks. Silent no-op (returns null)
 * if AMBIGUOUS_API_KEY isn't configured — that's a valid, non-error state.
 */
export async function createAmbiguousRecord(
  _title: string,
  _body: string,
): Promise<
  { result: { recordId: string; url: string } | null; error: { code: string; message: string } | null }
> {
  // TODO(P3): the real MCP call (https://app.ambiguous.ai/mcp, Bearer
  // AMBIGUOUS_API_KEY) needs @modelcontextprotocol/sdk, which isn't in
  // this repo's package.json — that file is P2's exclusive territory
  // (CONTRATOS.md §1). Request the dependency from P2, or hand-roll the
  // JSON-RPC calls without the SDK, before wiring this in for real.
  // Safe no-op in the meantime: identical to "AMBIGUOUS_API_KEY unset",
  // which the addendum defines as a valid, non-error state.
  return { result: null, error: null };
}

export interface AmbiguousRecordSummary {
  recordId: string;
  title: string;
  status: string;
  url: string;
}

/**
 * docs/mvp/CONTRATOS.md §11 (Ambiguous read addendum, proposed 2026-09-12,
 * pending team confirmation like §10 was before Oscar/Daniel signed off).
 *
 * Same blocker as createAmbiguousRecord above, plus one more: per
 * using-sponsor-tools.md, Ambiguous's MCP tool names/arguments are
 * discovered live from the connected workspace, not fixed — there is no
 * documented stable REST endpoint (e.g. no GET /tasks in the public
 * openapi.json) to fall back on the way the GitHub client does. A real
 * implementation must open the MCP connection, list tools, and select the
 * read/list tool by description at runtime — never hardcode a tool name.
 * Safe no-op until @modelcontextprotocol/sdk is approved by P2 and there's
 * a live AMBIGUOUS_API_KEY to verify tool discovery against.
 */
export async function listAmbiguousRecords(): Promise<{
  records: AmbiguousRecordSummary[];
  complete: boolean;
  limitations: string[];
}> {
  return {
    records: [],
    complete: false,
    limitations: ["AMBIGUOUS_API_KEY not wired: MCP read tool not yet implemented (needs @modelcontextprotocol/sdk)."],
  };
}

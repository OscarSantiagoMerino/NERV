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

import { z } from "zod";
import type { GitHubRef } from "@/contracts/schemas";
import { githubConfig, proposalMarker, type GitHubConfig } from "./config";
import { fixtureCreateIssue, fixtureIssues } from "./fixture";

const LIST_TIMEOUT_MS = 10_000;
const CREATE_TIMEOUT_MS = 15_000;
const PER_PAGE = 50;

export class GitHubError extends Error {
  constructor(
    public code: "TIMEOUT" | "REJECTED" | "UNREACHABLE",
    message: string,
    /** True when the request may have been applied even though we never saw the answer. */
    public ambiguous: boolean,
  ) {
    super(message);
  }
}

// Only the fields NERV reads. GitHub returns far more; parsing narrowly
// keeps remote text from reaching anything that treats it as structure.
const IssuePayload = z.object({
  number: z.number().int().positive(),
  html_url: z.string(),
  title: z.string(),
  state: z.enum(["open", "closed"]),
  body: z.string().nullable().optional(),
  updated_at: z.string(),
  labels: z.array(z.union([z.string(), z.object({ name: z.string() })])).default([]),
  pull_request: z.unknown().optional(),
});

function toRef(repo: string, raw: z.infer<typeof IssuePayload>): GitHubRef {
  return {
    repo,
    number: raw.number,
    url: raw.html_url,
    title: raw.title,
    state: raw.state,
    labels: raw.labels.map((label) => (typeof label === "string" ? label : label.name)),
    body: raw.body ?? "",
    updatedAt: raw.updated_at,
  };
}

async function call(
  config: Extract<GitHubConfig, { mode: "live" }>,
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`https://api.github.com${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        authorization: `Bearer ${config.token}`,
        ...init.headers,
      },
    });
  } catch (cause) {
    const timedOut = controller.signal.aborted;
    // A write that never came back may still have landed; a read that
    // fails simply produced nothing. The caller decides what to do with
    // the difference, so carry it rather than flattening both to "failed".
    throw new GitHubError(
      timedOut ? "TIMEOUT" : "UNREACHABLE",
      timedOut ? "GitHub did not answer in time." : "GitHub could not be reached.",
      init.method === "POST",
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new GitHubError(
      "REJECTED",
      `GitHub refused the request (${response.status}).${detail.slice(0, 200)}`,
      false,
    );
  }
  return response.json();
}

/** Open and closed issues, pull requests excluded — a PR is not a task. */
export async function listIssues(config = githubConfig()): Promise<GitHubRef[]> {
  if (config.mode === "fixture") return await fixtureIssues(config.repo);

  const raw = await call(
    config,
    `/repos/${config.repo}/issues?state=all&per_page=${PER_PAGE}&sort=updated`,
    { method: "GET" },
    LIST_TIMEOUT_MS,
  );
  const parsed = z.array(IssuePayload).safeParse(raw);
  if (!parsed.success) {
    throw new GitHubError("REJECTED", "GitHub returned issues in an unreadable shape.", false);
  }
  return parsed.data
    .filter((issue) => issue.pull_request === undefined)
    .map((issue) => toRef(config.repo, issue));
}

export async function createIssue(
  input: { title: string; body: string },
  config = githubConfig(),
): Promise<GitHubRef> {
  if (config.mode === "fixture") {
    const issue = await fixtureCreateIssue(config.repo, input);
    // Lets the ambiguous path be rehearsed without a real network fault:
    // the issue exists, the answer is lost, reconciliation has to find it.
    if (process.env.NERV_GITHUB_SIMULATE === "timeout") {
      throw new GitHubError("TIMEOUT", "GitHub did not answer in time.", true);
    }
    return issue;
  }

  const raw = await call(
    config,
    `/repos/${config.repo}/issues`,
    { method: "POST", body: JSON.stringify(input), headers: { "content-type": "application/json" } },
    CREATE_TIMEOUT_MS,
  );
  const parsed = IssuePayload.safeParse(raw);
  if (!parsed.success) {
    // The write may well have succeeded; we just cannot read the answer.
    throw new GitHubError("TIMEOUT", "GitHub answered in an unreadable shape.", true);
  }
  return toRef(config.repo, parsed.data);
}

/**
 * Finds a previously created issue by its proposal marker. Not finding it
 * in a partial read does not prove it is absent, so callers must treat a
 * null as "still unknown", never as "never created".
 */
export async function findIssueByMarker(
  proposalId: string,
  config = githubConfig(),
): Promise<GitHubRef | null> {
  const marker = proposalMarker(proposalId);
  const issues = await listIssues(config);
  return issues.find((issue) => issue.body.includes(marker)) ?? null;
}

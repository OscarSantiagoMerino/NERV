/**
 * Thin GitHub REST wrapper — classic PAT (repo scope), no extra dependency.
 * Owner: P3 (docs/mvp/CONTRATOS.md §1, src/server/github/mvp/).
 */
import {
  ambiguousApiKey,
  withAmbiguousClient,
  pickReadTool,
  pickCreateTool,
  buildCreateArgs,
  extractText,
  extractRecordRef,
  extractRecordList,
  type AmbiguousTool,
  type AmbiguousRecordSummary,
} from "./ambiguousMcp";

export type { AmbiguousRecordSummary } from "./ambiguousMcp";

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
 *
 * Verified 2026-09-12 against the live NERV Ambiguous workspace — `create_task`
 * is the right tool, but its response has no `url` field (see ambiguousMcp.ts's
 * extractRecordRef comment); `result.url` is therefore null on this workspace,
 * never fabricated. `result.taskKey` (e.g. "TASK-001") is the human-readable
 * reference to show instead of a link.
 */
export async function createAmbiguousRecord(
  title: string,
  body: string,
): Promise<
  {
    result: { recordId: string; taskKey: string | null; url: string | null } | null;
    error: { code: string; message: string } | null;
  }
> {
  const apiKey = ambiguousApiKey();
  if (!apiKey) return { result: null, error: null };

  try {
    return await withAmbiguousClient(apiKey, async (client) => {
      const { tools } = await client.listTools();
      const createTool = pickCreateTool(tools as AmbiguousTool[]);
      if (!createTool) {
        return {
          result: null,
          error: {
            code: "ambiguous_no_create_tool",
            message: "No create/task tool discovered in this Ambiguous workspace.",
          },
        };
      }
      const args = buildCreateArgs(createTool, title, body);
      const response = await client.callTool({ name: createTool.name, arguments: args });
      if (response.isError) {
        return {
          result: null,
          error: { code: "ambiguous_create_failed", message: extractText(response) || "Ambiguous tool call failed." },
        };
      }
      const parsed = extractRecordRef(response);
      if (!parsed) {
        return {
          result: null,
          error: {
            code: "ambiguous_unrecognized_response",
            message: `Tool "${createTool.name}" succeeded but no recordId could be parsed from its response.`,
          },
        };
      }
      return { result: parsed, error: null };
    });
  } catch (err) {
    return {
      result: null,
      error: { code: "ambiguous_connection_failed", message: err instanceof Error ? err.message : String(err) },
    };
  }
}

/**
 * docs/mvp/CONTRATOS.md §11 (Ambiguous read addendum, proposed 2026-09-12,
 * pending team confirmation like §10 was before Oscar/Daniel signed off).
 *
 * Verified 2026-09-12 against the live NERV Ambiguous workspace (856 discovered
 * tools) — `list_tasks` is the right tool. Per using-sponsor-tools.md,
 * Ambiguous's tool names/arguments are discovered live from the connected
 * workspace, never hardcoded here; the selection heuristic in ambiguousMcp.ts
 * is tuned against this workspace's actual naming, not guessed.
 */
export async function listAmbiguousRecords(): Promise<{
  records: AmbiguousRecordSummary[];
  complete: boolean;
  limitations: string[];
}> {
  const apiKey = ambiguousApiKey();
  if (!apiKey) {
    return { records: [], complete: false, limitations: ["AMBIGUOUS_API_KEY not configured."] };
  }

  try {
    return await withAmbiguousClient(apiKey, async (client) => {
      const { tools } = await client.listTools();
      const readTool = pickReadTool(tools as AmbiguousTool[]);
      if (!readTool) {
        return {
          records: [],
          complete: false,
          limitations: ["No no-argument read/list tool discovered in this Ambiguous workspace."],
        };
      }
      const response = await client.callTool({ name: readTool.name, arguments: {} });
      if (response.isError) {
        return {
          records: [],
          complete: false,
          limitations: [`Ambiguous read tool "${readTool.name}" failed: ${extractText(response)}`],
        };
      }
      const records = extractRecordList(response);
      return {
        records,
        complete: true,
        limitations: records.length ? [] : [`Read tool "${readTool.name}" returned no parsable records.`],
      };
    });
  } catch (err) {
    return {
      records: [],
      complete: false,
      limitations: [`Ambiguous connection failed: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

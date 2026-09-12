// The repository is server configuration, never something the browser sends:
// a client that could choose the repo could make NERV write anywhere.

export type GitHubConfig =
  | { mode: "live"; repo: string; token: string }
  | { mode: "fixture"; repo: string };

export const DEFAULT_REPO = "OscarSantiagoMerino/NERV";

/**
 * Live only when a token is present. Without one the demo still runs
 * end to end against a fixture repository, and every surface says so —
 * an unlabelled fake would be worse than no integration at all.
 */
export function githubConfig(): GitHubConfig {
  const repo = (process.env.GITHUB_REPO ?? DEFAULT_REPO).trim();
  const token = (process.env.GITHUB_TOKEN ?? "").trim();
  if (token.length === 0 || token === "stub-replace-me") {
    return { mode: "fixture", repo };
  }
  return { mode: "live", repo, token };
}

export function issueUrl(repo: string, number: number): string {
  return `https://github.com/${repo}/issues/${number}`;
}

export function repoUrl(repo: string): string {
  return `https://github.com/${repo}`;
}

/** Marker embedded in a proposal body so a lost response can be reconciled. */
export function proposalMarker(proposalId: string): string {
  return `nerv-proposal:${proposalId}`;
}

export function markerComment(proposalId: string): string {
  return `<!-- ${proposalMarker(proposalId)} -->`;
}

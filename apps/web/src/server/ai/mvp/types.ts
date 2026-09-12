/**
 * TEMPORARY — duplicates the shapes P2 owns in src/contracts/mvp/index.ts
 * (docs/mvp/CONTRATOS.md §2). Delete this file and import from there once
 * P2 publishes it; do not diverge the shapes in the meantime.
 */

export type WorkflowState = "todo" | "in_progress" | "done";

export interface DemoProfile {
  id: string;
  name: string;
  roleLabel: string;
}

export interface Project {
  id: string;
  title: string;
  purpose: string;
  goal: string;
  scope: string;
  successCriterion: string;
  milestone: { id: string; title: string; accountableProfileId: string };
  repo: string;
}

export interface GitHubRef {
  repo: string;
  number: number;
  url: string;
  state: "open" | "closed";
  labels: string[];
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  body: string;
  milestoneId: string;
  ownerProfileId: string | null;
  workflowState: WorkflowState;
  github: GitHubRef;
  version: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  profileId: string;
  text: string;
  createdAt: string;
}

export interface Snapshot {
  id: string;
  fetchedAt: string;
  mode: "live" | "fixture";
  complete: boolean;
  issues: GitHubRef[];
  limitations: string[];
}

export interface Review {
  id: string;
  goalImpact: string;
  summary: string;
  evidenceTaskIds: string[];
  snapshotId: string;
  limitations: string[];
  proposalId: string | null;
  createdAt: string;
}

export type ProposalStatus =
  | "pending"
  | "rejected"
  | "executing"
  | "applied"
  | "failed"
  | "uncertain";

export interface Proposal {
  id: string;
  reviewId: string;
  version: number;
  status: ProposalStatus;
  payload: { title: string; body: string };
  rationale: string;
  evidenceTaskIds: string[];
  createdAt: string;
  approvedAt: string | null;
  approvedByDemoProfileId: string | null;
  result: { number: number; url: string } | null;
  error: { code: string; message: string } | null;
}

export interface DemoState {
  demoMode: true;
  project: Project;
  profiles: DemoProfile[];
  tasks: Task[];
  messages: Message[];
  snapshot: Snapshot | null;
  reviews: Review[];
  proposals: Proposal[];
}

export interface DemoContext {
  projectId: string;
  repo: string;
  profileId: string;
}

export type ProposalOutcome =
  | { status: "applied"; result: { number: number; url: string }; newTask: Task }
  | { status: "failed" | "uncertain"; error: { code: string; message: string } };

import { z } from "zod";

// Field names follow docs/plan/CONTRATOS.md §2 so later P1/P3 work merges
// cleanly, even though the cut-scope MVP (docs/context/mvp-revisado-110min.md)
// only exercises a subset: Charter is read-only, RACI/KPI/Risk/Meeting are
// out of scope, `authSubject` holds a fake identity instead of an Auth0 sub.

export const MemberSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  authSubject: z.string(), // fake identity id under cut-scope, not an Auth0 sub
  displayName: z.string(),
  githubLogin: z.string().optional(),
  accessRole: z.enum(["lead", "member"]),
  locale: z.enum(["en", "es"]).default("en"),
  timeZone: z.string().default("America/Bogota"),
});
export type Member = z.infer<typeof MemberSchema>;

export const CharterSchema = z.object({
  purpose: z.string(),
  sponsorName: z.string(),
  leadMemberId: z.string(),
  beneficiaries: z.string(),
  scopeIn: z.array(z.string()),
  scopeOut: z.array(z.string()),
  deliverables: z.array(z.string()),
  constraints: z.array(z.string()),
  assumptions: z.array(z.string()),
  successCriteria: z.array(z.string()),
  status: z.enum(["draft", "approved"]).default("draft"),
  approvedBy: z.string().nullable().default(null),
  approvedAt: z.string().nullable().default(null), // ISO 8601 UTC
});
export type Charter = z.infer<typeof CharterSchema>;

export const MilestoneSchema = z.object({
  id: z.string(),
  objectiveId: z.string(),
  title: z.string(),
  dueAt: z.string().nullable(),
  acceptanceCriteria: z.string(),
  raci: z.object({
    accountableId: z.string(),
    responsibleIds: z.array(z.string()).min(1),
    consultedIds: z.array(z.string()).default([]),
    informedIds: z.array(z.string()).default([]),
  }),
});
export type Milestone = z.infer<typeof MilestoneSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  origin: z.enum(["manual", "github"]),
  milestoneId: z.string().nullable(),
  title: z.string(),
  description: z.string().default(""),
  workflowState: z.enum(["todo", "doing", "done"]),
  responsibleId: z.string().nullable(),
  dueAt: z.string().nullable(),
  estimateMinutes: z.number().nonnegative().nullable(),
  acceptanceCriteria: z.string().default(""),
  blocked: z.boolean().default(false),
  githubIssueNumber: z.number().int().positive().nullable(),
  githubUrl: z.string().nullable(),
  // Mirror of the last GitHub read. NERV's workflowState and GitHub's
  // open/closed are separate: moving a card to Done never closes an issue,
  // and a sync never rewrites workflowState.
  githubState: z.enum(["open", "closed"]).nullable().default(null),
  githubLabels: z.array(z.string()).default([]),
  githubUpdatedAt: z.string().nullable().default(null),
  version: z.number().int().nonnegative().default(1),
});
export type Task = z.infer<typeof TaskSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  authorMemberId: z.string(),
  text: z.string().max(2000),
  createdAt: z.string(), // ISO 8601 UTC
});
export type Message = z.infer<typeof MessageSchema>;

export const ObjectiveSchema = z.object({
  id: z.string(),
  statement: z.string(),
  ownerMemberId: z.string(),
  targetAt: z.string().nullable(),
});
export type Objective = z.infer<typeof ObjectiveSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  charter: CharterSchema,
  objective: ObjectiveSchema,
  milestones: z.array(MilestoneSchema),
  version: z.number().int().nonnegative().default(1),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const GitHubRefSchema = z.object({
  repo: z.string(), // "owner/name"
  number: z.number().int().positive(),
  url: z.string(),
  title: z.string(),
  state: z.enum(["open", "closed"]),
  labels: z.array(z.string()).default([]),
  body: z.string().default(""),
  updatedAt: z.string(), // ISO 8601 UTC
});
export type GitHubRef = z.infer<typeof GitHubRefSchema>;

/**
 * One GitHub read, kept whole so an approval can be checked against the
 * evidence the review actually saw — not against a later state of the repo.
 */
export const SnapshotSchema = z.object({
  id: z.string(),
  repo: z.string(),
  fetchedAt: z.string(),
  mode: z.enum(["live", "fixture"]),
  complete: z.boolean(),
  issues: z.array(GitHubRefSchema),
  limitations: z.array(z.string()).default([]),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

export const ReviewSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  snapshotId: z.string(),
  charterStatus: z.enum(["draft", "approved"]),
  projectVersion: z.number().int().nonnegative(),
  source: z.enum(["model", "heuristic"]),
  goalImpact: z.string(),
  summary: z.string(),
  evidenceTaskIds: z.array(z.string()).default([]),
  observations: z.array(z.string()).default([]),
  inferences: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  proposalId: z.string().nullable().default(null),
});
export type Review = z.infer<typeof ReviewSchema>;

export const PROPOSAL_STATUSES = [
  "pending",
  "rejected",
  "executing",
  "applied",
  "failed",
  "uncertain",
] as const;

/**
 * A proposal is immutable once written: `payload` is exactly what gets
 * published, so approving can never publish text the lead did not read.
 * To change it, reject and review again.
 */
export const ProposalSchema = z.object({
  id: z.string(),
  reviewId: z.string(),
  version: z.number().int().positive().default(1),
  status: z.enum(PROPOSAL_STATUSES),
  payload: z.object({ title: z.string(), body: z.string() }),
  rationale: z.string(),
  evidenceTaskIds: z.array(z.string()).default([]),
  // Stable id embedded in the issue body as an HTML comment, so an
  // uncertain result can be reconciled by searching for it instead of
  // blindly creating the issue a second time.
  marker: z.string(),
  createdAt: z.string(),
  approvedAt: z.string().nullable().default(null),
  approvedByMemberId: z.string().nullable().default(null),
  result: z
    .object({ repo: z.string(), number: z.number().int().positive(), url: z.string() })
    .nullable()
    .default(null),
  error: z.object({ code: z.string(), message: z.string() }).nullable().default(null),
});
export type Proposal = z.infer<typeof ProposalSchema>;

export const StoreSchema = z.object({
  project: ProjectSchema,
  members: z.array(MemberSchema),
  tasks: z.array(TaskSchema),
  messages: z.array(MessageSchema),
  snapshot: SnapshotSchema.nullable().default(null),
  snapshots: z.array(SnapshotSchema).default([]),
  reviews: z.array(ReviewSchema).default([]),
  proposals: z.array(ProposalSchema).default([]),
});
export type Store = z.infer<typeof StoreSchema>;

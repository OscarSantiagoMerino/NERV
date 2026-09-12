import { z } from "zod";

// Types and Zod schemas per docs/mvp/CONTRATOS.md §2. This file is the
// single source of truth for the MVP's wire/storage shapes; P1 and P3
// import from here rather than redeclaring these types.

export const WorkflowStateSchema = z.enum(["todo", "in_progress", "done"]);
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;

export const DemoProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  roleLabel: z.string(),
});
export type DemoProfile = z.infer<typeof DemoProfileSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  purpose: z.string(),
  goal: z.string(),
  scope: z.string(),
  successCriterion: z.string(),
  milestone: z.object({
    id: z.string(),
    title: z.string(),
    accountableProfileId: z.string(),
  }),
  repo: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const GitHubRefSchema = z.object({
  repo: z.string(),
  number: z.number().int().positive(),
  url: z.string(),
  state: z.enum(["open", "closed"]),
  labels: z.array(z.string()),
  updatedAt: z.string(),
});
export type GitHubRef = z.infer<typeof GitHubRefSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  milestoneId: z.string(),
  ownerProfileId: z.string().nullable(),
  workflowState: WorkflowStateSchema,
  github: GitHubRefSchema,
  version: z.number().int().min(1),
  updatedAt: z.string(),
});
export type Task = z.infer<typeof TaskSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  text: z.string().min(1).max(2000),
  createdAt: z.string(),
});
export type Message = z.infer<typeof MessageSchema>;

export const SnapshotSchema = z.object({
  id: z.string(),
  fetchedAt: z.string(),
  mode: z.enum(["live", "fixture"]),
  complete: z.boolean(),
  issues: z.array(GitHubRefSchema),
  limitations: z.array(z.string()),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

export const ReviewSchema = z.object({
  id: z.string(),
  goalImpact: z.string(),
  summary: z.string(),
  evidenceTaskIds: z.array(z.string()),
  snapshotId: z.string(),
  limitations: z.array(z.string()),
  proposalId: z.string().nullable(),
  createdAt: z.string(),
});
export type Review = z.infer<typeof ReviewSchema>;

export const ProposalStatusSchema = z.enum([
  "pending",
  "rejected",
  "executing",
  "applied",
  "failed",
  "uncertain",
]);
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

export const ProposalSchema = z.object({
  id: z.string(),
  reviewId: z.string(),
  version: z.number().int().min(1),
  status: ProposalStatusSchema,
  payload: z.object({
    title: z.string(),
    body: z.string(),
  }),
  rationale: z.string(),
  evidenceTaskIds: z.array(z.string()),
  createdAt: z.string(),
  approvedAt: z.string().nullable(),
  approvedByDemoProfileId: z.string().nullable(),
  result: z.object({ number: z.number().int().positive(), url: z.string() }).nullable(),
  // Adenda 2026-09-12 (docs/mvp/CONTRATOS.md §10): Ambiguous export, parallel
  // to `result`. Pending team confirmation — see the addendum for why.
  ambiguous: z.object({ recordId: z.string(), url: z.string() }).nullable().default(null),
  ambiguousError: z.object({ code: z.string(), message: z.string() }).nullable().default(null),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
});
export type Proposal = z.infer<typeof ProposalSchema>;

export const DemoStateSchema = z.object({
  demoMode: z.literal(true),
  project: ProjectSchema,
  profiles: z.array(DemoProfileSchema),
  tasks: z.array(TaskSchema),
  messages: z.array(MessageSchema),
  snapshot: SnapshotSchema.nullable(),
  reviews: z.array(ReviewSchema),
  proposals: z.array(ProposalSchema),
});
export type DemoState = z.infer<typeof DemoStateSchema>;

// Request bodies validated at the API boundary.
export const PatchTaskBodySchema = z.object({
  workflowState: WorkflowStateSchema,
  expectedVersion: z.number().int().min(1),
});
export type PatchTaskBody = z.infer<typeof PatchTaskBodySchema>;

export const PostMessageBodySchema = z.object({
  text: z.string().min(1).max(2000),
});
export type PostMessageBody = z.infer<typeof PostMessageBodySchema>;

export const ApproveProposalBodySchema = z.object({
  expectedVersion: z.number().int().min(1),
});
export type ApproveProposalBody = z.infer<typeof ApproveProposalBodySchema>;

// Context resolved by getDemoContext(request) — see server/platform/mvp.
export type DemoContext = {
  projectId: string;
  repo: string;
  profileId: string;
};

export type ProposalOutcome =
  | {
      status: "applied";
      result: { number: number; url: string };
      newTask: Task;
      // Adenda Ambiguous (docs/mvp/CONTRATOS.md §10): optional, never blocks
      // or reverts the GitHub result. Omit both if Ambiguous isn't configured.
      ambiguous?: { recordId: string; url: string } | null;
      ambiguousError?: { code: string; message: string } | null;
    }
  | { status: "failed" | "uncertain"; error: { code: string; message: string } };

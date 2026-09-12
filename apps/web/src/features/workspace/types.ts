export type WorkflowState = "todo" | "doing" | "done";
export type TaskOrigin = "manual" | "github";
export type AccessRole = "lead" | "member";
export type Locale = "en" | "es";

export type Member = {
  id: string;
  projectId: string;
  authSubject: string;
  displayName: string;
  githubLogin: string;
  accessRole: AccessRole;
  locale: Locale;
  timeZone: string;
};

export type Raci = {
  accountableId: string;
  responsibleIds: string[];
  consultedIds: string[];
  informedIds: string[];
};

export type Milestone = {
  id: string;
  objectiveId: string;
  title: string;
  dueAt: string;
  acceptanceCriteria: string;
  raci: Raci;
};

export type Objective = {
  id: string;
  statement: string;
  ownerMemberId: string;
  targetAt: string;
};

export type Charter = {
  purpose: string;
  sponsorName: string;
  leadMemberId: string;
  beneficiaries: string;
  scopeIn: string[];
  scopeOut: string[];
  deliverables: string[];
  constraints: string[];
  assumptions: string[];
  successCriteria: string[];
  status: "draft" | "approved";
  approvedBy: string | null;
  approvedAt: string | null;
};

export type Kpi = {
  id: string;
  name: string;
  category: "business" | "technical" | "governance" | "statistical";
  unit: string;
  target: number;
  current: number | null;
  direction: "increase" | "decrease";
  ownerMemberId: string;
  measuredAt: string | null;
  source: string | null;
};

export type Risk = {
  id: string;
  title: string;
  category: "data" | "scope" | "infrastructure" | "people";
  likelihood: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  ownerMemberId: string;
  mitigation: string;
  status: "open" | "monitoring" | "resolved";
};

export type Task = {
  id: string;
  projectId: string;
  origin: TaskOrigin;
  milestoneId: string | null;
  title: string;
  description: string;
  workflowState: WorkflowState;
  responsibleId: string | null;
  dueAt: string | null;
  estimateMinutes: number | null;
  acceptanceCriteria: string;
  blocked: boolean;
  githubIssueNumber: number | null;
  githubUrl: string | null;
  version: number;
  updatedAt: string;
};

export type Message = {
  id: string;
  projectId: string;
  authorMemberId: string;
  text: string;
  createdAt: string;
};

export type Project = {
  id: string;
  name: string;
  charter: Charter;
  objective: Objective;
  milestones: Milestone[];
  kpi: Kpi;
  risks: Risk[];
  version: number;
  updatedAt: string;
};

export type WorkspaceSnapshot = {
  project: Project;
  members: Member[];
  tasks: Task[];
  messages: Message[];
};

export const MESSAGE_MAX_LENGTH = 2000;
export const WORKFLOW_STATES: WorkflowState[] = ["todo", "doing", "done"];
export const ACTOR_HEADER = "x-nerv-member-id";

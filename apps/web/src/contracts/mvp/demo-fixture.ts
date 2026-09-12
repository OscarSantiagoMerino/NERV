import type { DemoProfile, DemoState, Project, Task } from "./index";

// Dev-time fixture per docs/mvp/CONTRATOS.md §6 / README.md §8. `mode:
// 'fixture'` must stay visible until P3 runs a live GitHub sync and
// replaces these placeholder issue numbers with the six real, authorized
// issues in the target repo. Never treat this data as a live demo result.

export const DEMO_REPO = process.env.GITHUB_REPO ?? "OscarSantiagoMerino/NERV";

export const demoProfiles: DemoProfile[] = [
  { id: "profile-lead", name: "Lead", roleLabel: "Milestone owner" },
  { id: "profile-eng", name: "Engineer", roleLabel: "Implementation" },
  { id: "profile-qa", name: "QA", roleLabel: "Testing" },
];

export const demoProject: Project = {
  id: "proj-signup-mvp",
  title: "Validate a signup flow with five test users",
  purpose: "Confirm the signup flow works for real users before wider rollout.",
  goal: "Complete a validation round with five test users.",
  scope: "Signup flow only; no onboarding or billing.",
  successCriterion: "Five documented test runs, with critical failures resolved.",
  milestone: {
    id: "ms-ready-for-validation",
    title: "Ready for user validation",
    accountableProfileId: "profile-lead",
  },
  repo: DEMO_REPO,
};

function fixtureIssue(number: number, state: "open" | "closed", labels: string[]): Task["github"] {
  return {
    repo: DEMO_REPO,
    number,
    url: `https://github.com/${DEMO_REPO}/issues/${number}`,
    state,
    labels,
    updatedAt: "2026-09-12T18:00:00.000Z",
  };
}

export const sixTasksSeed: Task[] = [
  {
    id: "task-define-criteria",
    title: "Define acceptance criteria for the signup flow",
    body: "",
    milestoneId: "ms-ready-for-validation",
    ownerProfileId: "profile-lead",
    workflowState: "done",
    github: fixtureIssue(9001, "closed", ["nerv-demo"]),
    version: 1,
    updatedAt: "2026-09-12T18:00:00.000Z",
  },
  {
    id: "task-implement-signup",
    title: "Implement the signup form",
    body: "",
    milestoneId: "ms-ready-for-validation",
    ownerProfileId: "profile-eng",
    workflowState: "done",
    github: fixtureIssue(9002, "closed", ["nerv-demo"]),
    version: 1,
    updatedAt: "2026-09-12T18:00:00.000Z",
  },
  {
    id: "task-validate-email",
    title: "Validate email confirmation step",
    body: "Blocked: confirmation emails are not arriving in the test inbox.",
    milestoneId: "ms-ready-for-validation",
    ownerProfileId: "profile-eng",
    workflowState: "in_progress",
    github: fixtureIssue(9003, "open", ["nerv-demo", "blocked"]),
    version: 1,
    updatedAt: "2026-09-12T18:00:00.000Z",
  },
  {
    id: "task-recruit-users",
    title: "Recruit five test users",
    body: "",
    milestoneId: "ms-ready-for-validation",
    ownerProfileId: "profile-qa",
    workflowState: "in_progress",
    github: fixtureIssue(9004, "open", ["nerv-demo"]),
    version: 1,
    updatedAt: "2026-09-12T18:00:00.000Z",
  },
  {
    id: "task-run-tests",
    title: "Run test sessions with the five users",
    body: "",
    milestoneId: "ms-ready-for-validation",
    ownerProfileId: "profile-qa",
    workflowState: "todo",
    github: fixtureIssue(9005, "open", ["nerv-demo"]),
    version: 1,
    updatedAt: "2026-09-12T18:00:00.000Z",
  },
  {
    id: "task-document-results",
    title: "Document results and share with the team",
    body: "",
    milestoneId: "ms-ready-for-validation",
    ownerProfileId: "profile-lead",
    workflowState: "todo",
    github: fixtureIssue(9006, "open", ["nerv-demo"]),
    version: 1,
    updatedAt: "2026-09-12T18:00:00.000Z",
  },
];

export const seedDemoState: DemoState = {
  demoMode: true,
  project: demoProject,
  profiles: demoProfiles,
  tasks: sixTasksSeed,
  messages: [
    {
      id: "msg-1",
      profileId: "profile-lead",
      text: "Starting the signup validation round — goal is 5/5 unassisted completions.",
      createdAt: "2026-09-12T18:00:00.000Z",
    },
  ],
  snapshot: {
    id: "snapshot-fixture-1",
    fetchedAt: "2026-09-12T18:00:00.000Z",
    mode: "fixture",
    complete: true,
    issues: sixTasksSeed.map((t) => t.github),
    limitations: ["Fixture data — replace with a live GitHub sync before demoing."],
  },
  reviews: [],
  proposals: [],
};

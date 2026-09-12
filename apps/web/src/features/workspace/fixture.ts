import type { WorkspaceSnapshot } from "./types";

export const FIXTURE_MODE = "fixture" as const;

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

const MEMBER_LEAD = "21111111-1111-4111-8111-111111111111";
const MEMBER_ENG = "22222222-2222-4222-8222-222222222222";
const MEMBER_RESEARCH = "23333333-3333-4333-8333-333333333333";

const OBJECTIVE_ID = "31111111-1111-4111-8111-111111111111";
const MILESTONE_ONBOARDING = "41111111-1111-4111-8111-111111111111";
const MILESTONE_VALIDATION = "42222222-2222-4222-8222-222222222222";

const SEEDED_AT = "2026-09-12T12:00:00.000Z";

export function createFixtureSnapshot(): WorkspaceSnapshot {
  return {
    project: {
      id: PROJECT_ID,
      name: "Signup flow validation",
      version: 1,
      updatedAt: SEEDED_AT,
      charter: {
        purpose:
          "Validate that the redesigned signup flow lets a new user reach a working account without assistance.",
        sponsorName: "Head of Product",
        leadMemberId: MEMBER_LEAD,
        beneficiaries: "Prospective users completing first-time signup, and the support team handling failed registrations.",
        scopeIn: [
          "Email signup path on web",
          "Moderated tests with five recruited users",
          "Instrumentation of the three drop-off points already identified",
        ],
        scopeOut: [
          "Social and SSO signup paths",
          "Mobile application",
          "Pricing and billing screens",
        ],
        deliverables: [
          "Test protocol and recruitment list",
          "Session recordings with annotated drop-off points",
          "Prioritised defect list with owners",
        ],
        constraints: [
          "Five test users only; no incentive budget approved",
          "No production data may leave the analytics environment",
        ],
        assumptions: [
          "Recruited users match the target segment",
          "The staging environment mirrors production signup behaviour",
        ],
        successCriteria: [
          "At least four of five users complete signup unaided",
          "Every blocking defect has a named owner and a milestone",
        ],
        status: "draft",
        approvedBy: null,
        approvedAt: null,
      },
      objective: {
        id: OBJECTIVE_ID,
        statement:
          "Five recruited users attempt signup unaided; at least four reach a working account.",
        ownerMemberId: MEMBER_LEAD,
        targetAt: "2026-09-26T22:00:00.000Z",
      },
      milestones: [
        {
          id: MILESTONE_ONBOARDING,
          objectiveId: OBJECTIVE_ID,
          title: "Test environment and protocol ready",
          dueAt: "2026-09-18T22:00:00.000Z",
          acceptanceCriteria:
            "Staging signup reachable by external testers and the protocol reviewed by the lead.",
          raci: {
            accountableId: MEMBER_LEAD,
            responsibleIds: [MEMBER_ENG],
            consultedIds: [MEMBER_RESEARCH],
            informedIds: [],
          },
        },
        {
          id: MILESTONE_VALIDATION,
          objectiveId: OBJECTIVE_ID,
          title: "Five sessions run and defects triaged",
          dueAt: "2026-09-26T22:00:00.000Z",
          acceptanceCriteria:
            "Five sessions recorded, drop-off points annotated and every blocking defect owned.",
          raci: {
            accountableId: MEMBER_LEAD,
            responsibleIds: [MEMBER_RESEARCH, MEMBER_ENG],
            consultedIds: [],
            informedIds: [MEMBER_LEAD],
          },
        },
      ],
      kpi: {
        id: "51111111-1111-4111-8111-111111111111",
        name: "Users completing signup unaided",
        category: "business",
        unit: "users",
        target: 5,
        current: 2,
        direction: "increase",
        ownerMemberId: MEMBER_RESEARCH,
        measuredAt: "2026-09-12T11:30:00.000Z",
        source: "Moderated session notes, sessions 1-2",
      },
      risks: [
        {
          id: "61111111-1111-4111-8111-111111111111",
          title: "Staging signup blocks external email domains",
          category: "infrastructure",
          likelihood: "high",
          impact: "high",
          ownerMemberId: MEMBER_ENG,
          mitigation:
            "Allow-list the recruited testers' domains before the next session batch.",
          status: "open",
        },
      ],
    },
    members: [
      {
        id: MEMBER_LEAD,
        projectId: PROJECT_ID,
        authSubject: "fixture|lead",
        displayName: "Oscar Merino",
        githubLogin: "OscarSantiagoMerino",
        accessRole: "lead",
        locale: "es",
        timeZone: "America/Bogota",
      },
      {
        id: MEMBER_ENG,
        projectId: PROJECT_ID,
        authSubject: "fixture|engineer",
        displayName: "Wei Chen",
        githubLogin: "fixture-engineer",
        accessRole: "member",
        locale: "en",
        timeZone: "Asia/Singapore",
      },
      {
        id: MEMBER_RESEARCH,
        projectId: PROJECT_ID,
        authSubject: "fixture|researcher",
        displayName: "Dana Ruiz",
        githubLogin: "fixture-researcher",
        accessRole: "member",
        locale: "en",
        timeZone: "America/Los_Angeles",
      },
    ],
    tasks: [
      {
        id: "71111111-1111-4111-8111-111111111111",
        projectId: PROJECT_ID,
        origin: "manual",
        milestoneId: MILESTONE_ONBOARDING,
        title: "Allow-list tester email domains in staging",
        description:
          "External testers cannot receive the confirmation email, so signup cannot be completed unaided.",
        workflowState: "doing",
        responsibleId: MEMBER_ENG,
        dueAt: "2026-09-16T22:00:00.000Z",
        estimateMinutes: 120,
        acceptanceCriteria:
          "A recruited tester receives the confirmation email in staging and completes signup.",
        blocked: true,
        githubIssueNumber: null,
        githubUrl: null,
        version: 1,
        updatedAt: SEEDED_AT,
      },
      {
        id: "72222222-2222-4222-8222-222222222222",
        projectId: PROJECT_ID,
        origin: "manual",
        milestoneId: MILESTONE_ONBOARDING,
        title: "Write the moderated session protocol",
        description:
          "Tasks, prompts and the three drop-off points to observe during each session.",
        workflowState: "done",
        responsibleId: MEMBER_RESEARCH,
        dueAt: "2026-09-15T22:00:00.000Z",
        estimateMinutes: 180,
        acceptanceCriteria: "Protocol reviewed by the lead and stored with the project.",
        blocked: false,
        githubIssueNumber: null,
        githubUrl: null,
        version: 1,
        updatedAt: SEEDED_AT,
      },
      {
        id: "73333333-3333-4333-8333-333333333333",
        projectId: PROJECT_ID,
        origin: "manual",
        milestoneId: MILESTONE_ONBOARDING,
        title: "Recruit five users from the target segment",
        description: "Five confirmed participants with scheduled slots across three time zones.",
        workflowState: "done",
        responsibleId: MEMBER_RESEARCH,
        dueAt: "2026-09-16T22:00:00.000Z",
        estimateMinutes: 240,
        acceptanceCriteria: "Five participants confirmed with a scheduled slot each.",
        blocked: false,
        githubIssueNumber: null,
        githubUrl: null,
        version: 1,
        updatedAt: SEEDED_AT,
      },
      {
        id: "74444444-4444-4444-8444-444444444444",
        projectId: PROJECT_ID,
        origin: "manual",
        milestoneId: MILESTONE_VALIDATION,
        title: "Instrument the three known drop-off points",
        description:
          "Emit an event at each drop-off point so sessions can be compared against real traffic.",
        workflowState: "todo",
        responsibleId: MEMBER_ENG,
        dueAt: "2026-09-22T22:00:00.000Z",
        estimateMinutes: 300,
        acceptanceCriteria: "All three events visible in the analytics environment.",
        blocked: false,
        githubIssueNumber: null,
        githubUrl: null,
        version: 1,
        updatedAt: SEEDED_AT,
      },
      {
        id: "75555555-5555-4555-8555-555555555555",
        projectId: PROJECT_ID,
        origin: "manual",
        milestoneId: MILESTONE_VALIDATION,
        title: "Run sessions 3 to 5",
        description: "Remaining moderated sessions, recorded and annotated.",
        workflowState: "todo",
        responsibleId: MEMBER_RESEARCH,
        dueAt: "2026-09-24T22:00:00.000Z",
        estimateMinutes: 360,
        acceptanceCriteria: "Three recordings stored with annotated drop-off points.",
        blocked: false,
        githubIssueNumber: null,
        githubUrl: null,
        version: 1,
        updatedAt: SEEDED_AT,
      },
      {
        id: "76666666-6666-4666-8666-666666666666",
        projectId: PROJECT_ID,
        origin: "manual",
        milestoneId: null,
        title: "Triage defects found in sessions 1 and 2",
        description: "Unplanned intake: defects observed before the protocol was finalised.",
        workflowState: "todo",
        responsibleId: null,
        dueAt: null,
        estimateMinutes: null,
        acceptanceCriteria: "Every defect has an owner and a milestone, or is explicitly deferred.",
        blocked: false,
        githubIssueNumber: null,
        githubUrl: null,
        version: 1,
        updatedAt: SEEDED_AT,
      },
    ],
    messages: [
      {
        id: "81111111-1111-4111-8111-111111111111",
        projectId: PROJECT_ID,
        authorMemberId: MEMBER_RESEARCH,
        text: "Sessions 1 and 2 are done. Both users stalled at the email confirmation step, so we are at 2 of 5.",
        createdAt: "2026-09-12T11:35:00.000Z",
      },
      {
        id: "82222222-2222-4222-8222-222222222222",
        projectId: PROJECT_ID,
        authorMemberId: MEMBER_ENG,
        text: "That matches the staging allow-list problem. I marked the task blocked until the domains are cleared.",
        createdAt: "2026-09-12T11:41:00.000Z",
      },
    ],
  };
}

export const FIXTURE_PROJECT_ID = PROJECT_ID;
export const FIXTURE_LEAD_MEMBER_ID = MEMBER_LEAD;

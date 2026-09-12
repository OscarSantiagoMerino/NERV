export type NervAgentDefinition = Readonly<{
  id: string;
  name: string;
  description: string;
  interaction: "chat" | "on-demand";
  endpoint: string;
  runtimeAgentId: string | null;
  uiPlacement: "assistant-chat" | "review-panel";
  actionLabel: string | null;
  capabilities: readonly string[];
  approvalPolicy: "no-external-writes" | "proposal-requires-human";
}>;

export const NERV_AGENTS = {
  projectAssistant: {
    id: "project-assistant",
    name: "Project Assistant",
    description:
      "Explains the visible project room and navigates to existing panels or task cards.",
    interaction: "chat",
    endpoint: "/api/copilotkit",
    runtimeAgentId: "default",
    uiPlacement: "assistant-chat",
    actionLabel: null,
    capabilities: ["explain_project", "show_panel", "select_task"],
    approvalPolicy: "no-external-writes",
  },
  riskSpecialist: {
    id: "risk-specialist",
    name: "Risk Specialist",
    description:
      "Compares the Charter with a fresh GitHub snapshot and prepares at most one mitigation.",
    interaction: "on-demand",
    endpoint: "/api/review",
    runtimeAgentId: null,
    uiPlacement: "review-panel",
    actionLabel: "Review risks",
    capabilities: ["read_project", "read_github", "propose_mitigation"],
    approvalPolicy: "proposal-requires-human",
  },
} as const satisfies Record<string, NervAgentDefinition>;

export const NERV_AGENT_LIST = Object.values(NERV_AGENTS);

export type NervAgentId = (typeof NERV_AGENT_LIST)[number]["id"];

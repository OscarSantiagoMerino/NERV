import assert from "node:assert/strict";
import test from "node:test";
import { NERV_AGENTS, NERV_AGENT_LIST } from "./agent-catalog";

test("agent definitions expose stable and unique interface contracts", () => {
  assert.equal(new Set(NERV_AGENT_LIST.map((agent) => agent.id)).size, NERV_AGENT_LIST.length);
  assert.equal(NERV_AGENTS.projectAssistant.runtimeAgentId, "default");
  assert.equal(NERV_AGENTS.projectAssistant.endpoint, "/api/copilotkit");
  assert.equal(NERV_AGENTS.riskSpecialist.endpoint, "/api/mvp/review");
});

test("no agent can publish an external change by itself", () => {
  assert.ok(
    NERV_AGENT_LIST.every(
      (agent) =>
        agent.approvalPolicy === "no-external-writes" ||
        agent.approvalPolicy === "proposal-requires-human",
    ),
  );
  assert.ok(
    !(NERV_AGENTS.riskSpecialist.capabilities as readonly string[]).includes(
      "create_github_issue",
    ),
  );
});

# Agents, Everywhere — Bogotá — Early Brainstorm (superseded)

**Superseded by [`NERV_DEFINICION_Y_PLAN.md`](../NERV_DEFINICION_Y_PLAN.md).** The team
has since frozen a different, fully-specified plan (NERV — a PMO agent embedded in
GitHub, not Slack). Everything below and in `context/` was explored before that plan
existed and does not reflect the decided direction. Kept for reference only — e.g. the
Ambiguous AI CLI setup notes may still be useful if a "Best Use of Ambiguous Workspace"
angle ever gets revisited, but Slack/Teams is explicitly out of scope in the frozen plan.

Event facts (schedule, theme, judging rubric, prizes, sponsor resources — still
accurate, this part didn't change): [`context/hackathon.md`](context/hackathon.md).

Concepts explored before the team's plan was frozen: [`context/ideas.md`](context/ideas.md),
[`context/plan-idea-1.md`](context/plan-idea-1.md).

## Current status

- Starter kit (CopilotKit's `agents-everywhere-starter-kit`) cloned and `npm ci`'d locally.
- `.env` scaffolded; `OPENAI_API_KEY`, `INTELLIGENCE_API_KEY`, `CHANNEL_CODE` still
  placeholders — need OpenAI key + CopilotKit Slack channel setup (`npx copilotkit@latest
  channels setup`, interactive browser sign-in).
- Ambiguous AI verified reachable (CLI signup, ~4s, see `context/hackathon.md`) — not
  yet wired into any code.

## Still open

- Which concept to build (see `context/ideas.md`).
- Final one-line demo script / exact seed messages for the recording, once a concept
  is picked.
- Required deliverables, none done yet: project title, written description, public repo
  (this one), 2-minute demo video, social post tagging event partners.

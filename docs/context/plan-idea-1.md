# Idea 1 Plan — Buried Decision Catcher

Full build plan for the currently recommended concept (see `ideas.md` for how it compares
to the other candidates — this is one option, not the team decision).

## Concept

Someone asks a decision-shaped question in a Slack thread ("did we confirm scope with
the vendor?"), the conversation moves on, nobody replies. The agent notices the
unanswered question and:

1. **Core (must work):** replies in-thread, tagging whoever owns that topic.
2. **Layer on top (Ambiguous AI, verified fast to set up):** also files it as a task/CRM
   note in Ambiguous AI, so the catch becomes a durable record outside the chat, not just
   a ping.

Core alone is a complete, demoable story — the Ambiguous AI layer only adds on top, never
blocks the core demo.

## Architecture

- OpenAI Agents SDK — reasoning / tool-calling loop.
- CopilotKit Channels SDK — Slack integration (managed credentials, official starter kit,
  `apps/channel` in the starter kit repo).
- Ambiguous AI (MCP, `https://app.ambiguous.ai/mcp`) — durable task/CRM record. CLI
  signup verified ~4s, free tier covers a demo (see `hackathon.md`).

## Prize strategy

- Core (Slack + OpenAI) → eligible for the general track and "Best Use of CopilotKit"
  (AirPods Max per member) essentially for free, since Channels SDK is the core integration.
- Ambiguous AI layer → targets "Best Use of Ambiguous Workspace" (one NVIDIA DGX Spark),
  likely the least-contested bounty since the tool is less known/used. No longer a timing
  risk now that setup is verified fast — build it in from the start rather than testing
  live at the venue first.

## Current build status

- Starter kit (`agents-everywhere-starter-kit`) cloned and `npm ci`'d locally.
- `.env` scaffolded; `OPENAI_API_KEY`, `INTELLIGENCE_API_KEY`, `CHANNEL_CODE` still
  placeholders — need OpenAI key + CopilotKit Slack channel setup (`npx copilotkit@latest
  channels setup`, interactive browser sign-in).
- Ambiguous AI MCP connection not yet wired into `apps/channel`.

## Still open

- Final one-line demo script / exact Slack seed messages for the recording.
- Required deliverables (shared across any concept, see `hackathon.md`): project title,
  written description, public repo, 2-minute demo video, social post tagging partners.

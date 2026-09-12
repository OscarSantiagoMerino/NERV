# Hackathon Facts — Agents, Everywhere (Bogotá)

Source: https://bogota.aitinkerers.org/hackathons/h_q4-sNJw_JYI/ (verify live — schedule
below reflects when this was last checked, 2026-09-12 morning).

## Schedule

| Time | Activity |
|---|---|
| 10:00–10:30 a.m. | Arrive, check in |
| 10:30–11:00 a.m. | Global opening broadcast, challenge briefing, starter-kit walkthrough |
| 11:00–11:15 a.m. | Form teams, finalize project ideas |
| 11:15 a.m.–3:30 p.m. | Build |
| 3:30–4:00 p.m. | Submit in the portal |
| 4:00–4:45 p.m. | Optional local show-and-tell |
| 4:45–5:00 p.m. | Wrap, group photo |

## Theme

"Agents are leaving the chatbox. Build an agent for a place people already work, talk, or
live, then make it meaningfully more useful because of that context. Put it into the web,
mobile, Slack, Teams, messaging, browsers, voice, wearables, robotics, or somewhere nobody
expects to find one yet."

## Build eligibility

Every submitted project must be **net-new**, built during the event. Templates, starter
code, and libraries are fine as building blocks, but the submitted project's core
functionality has to be built during the hackathon — an existing project can't be
resubmitted or extended and entered as new.

## Required submission

1. Project title
2. Written description
3. Public GitHub repository
4. Two-minute demo video
5. Social media post tagging event partners

## Judging criteria (1–5 each)

| Criterion | What's scored | 5/5 looks like |
|---|---|---|
| Core Requirements & Functionality | Working agent, end-to-end, in the intended environment | Robust, reliable, fully functional |
| Innovation & Theme Alignment | Does the environment materially improve what the agent can do | "A surprising new agent pattern whose central value could not be reproduced in a standalone chatbox" |
| Technical Execution & Integration | Code, architecture, tool use, data handling, integration depth | Robust orchestration, thoughtful failure handling, deeply integrated |
| Usefulness & Agentic Experience | Clear value, intuitive, appropriate for its environment | Substantial value, uses context intelligently, stays controllable |

Key trap: a chatbot wrapped in a channel scores 2–3 on Innovation. The environment has to
be load-bearing, not decorative.

## Prizes

- **1st**: $10,000 OpenAI credits (team), Mac mini (each), $1,000 Exa credits, Exa swag
- **2nd**: $5,000 OpenAI credits, Ray-Ban Meta glasses (each), $500 Exa credits, swag
- **3rd**: $2,500 OpenAI credits, LOOI Robot (each), $250 Exa credits, swag
- **Best Use of Ambiguous AI**: one NVIDIA DGX Spark (team)
- **Best Use of CopilotKit**: AirPods Max (each)

1st/2nd/3rd compete against every AI Tinkerers city worldwide plus the virtual edition —
large pool. The two "Best Use of X" bounties are likely judged against a much smaller
pool (only teams that deeply used that specific sponsor), and Ambiguous AI in particular
has very little public documentation/community usage — probably the least-contested
bounty attached to the single biggest individual prize.

## Sponsor resources (from the starter kit)

- **OpenAI** — Agents SDK (tools, handoffs, voice), voice agents quickstart
- **CopilotKit** — Channels SDK, connects an agent to Slack/Teams with managed
  credentials; one-line scaffold: `npx copilotkit@latest skills install --skill
  setup-slack-channel -y`
- **OpenRouter** — single API across many models
- **Exa** — web search / content retrieval for agents
- **Auth0** — lets an agent act on APIs on a user's behalf
- **Ambiguous AI** — hosted workspace (mail, tasks, docs, sheets, slides, chat, forms,
  calendar, CRM, drive — 17 apps total), reachable over MCP at
  `https://app.ambiguous.ai/mcp` (Streamable HTTP + OAuth). **Verified fast**: CLI signup
  (`npx ambiguous auth signup --name "..." --human-email you@...`) provisions a workspace
  in ~4 seconds, no browser needed. Free tier: 5 members, 1,000 AI actions/month — plenty
  for a demo. A no-signup sandbox also exists (1hr expiry) for a zero-commitment test:
  `https://app.ambiguous.ai/sandbox`. Prize is officially named "Best Use of Ambiguous
  Workspace." No longer a stretch-only risk — safe to build against from the start.
- **Mozilla.ai** — optional, local inference / private research workflows

# NERV — the pitch

## The problem

About 85% of data and analytics projects inside companies never make it to
production (Gartner/McKinsey). Not because the models are wrong — because
nobody managed the *project* with real discipline. Tasks fall through
cracks. A team lead finds out about a blocker three weeks after it
happened, in a status meeting, when there's no time left to fix it. The
project plan lives in a slide deck; the real work happens somewhere else
entirely, and the two drift apart until someone notices too late.

## The idea

Don't hire one AI to do everything badly. Build a small team of agents,
each with one job — the way a real PMO has a project lead, a monitor, and
domain specialists, instead of one overworked generalist trying to hold
the whole project in its head at once.

## NERV is a team of agents, not one assistant

**Layer 1 — the project-lifecycle agents.** These run the PMO cycle
itself, each owning one phase, each with its own tools:

- **CharteringAgent** turns a plain-language project description into a
  real charter and a real backlog. Its tools — `create_milestone`,
  `create_issue`, `commit_file`, `apply_labels` — mean it doesn't describe
  the plan, it builds it as real GitHub objects.
- **StaffingAgent** works out who's responsible for what. Its tool,
  `assign_by_raci`, turns a responsibility matrix into real assignments
  instead of a spreadsheet nobody opens again.
- **MonitorAgent** watches the live repo continuously and catches drift
  before it's unrecoverable. Its tools — `get_metrics`, `post_issue`,
  `update_risks` — mean it doesn't just report status, it files the
  deviation as a real issue with a decision attached.

**Layer 2 — the specialist agents.** These are the domain experts
MonitorAgent calls in when a situation needs judgment, not just a number:
a risk/control specialist (live and running today), a planning specialist,
and a coordination specialist (both designed on the same architecture,
not yet staffed).

Every one of these is a separate agent with its own tools and its own
judgment — not one model wearing different hats, but a team where each
member only ever sees its own slice of the problem, the way a real
organization divides work.

**Why a team instead of one big agent:**

- Each agent's tool list is small and auditable — you can read exactly
  what CharteringAgent can do, and exactly what it can't (it can't touch
  risk metrics; MonitorAgent can't create milestones).
- Failure is contained — if the risk specialist's judgment is wrong, it
  doesn't corrupt chartering or staffing.
- It scales the way a real team scales — add a new specialist without
  touching the ones already working.

## The one guardrail across the whole team

No matter which agent reasoned its way to a conclusion, the same rule
applies: propose, never execute. A human clicks approve or reject before
anything real happens — one gate, shared by the whole team of agents, not
one per agent. This is what makes real autonomy safe to point at a live
GitHub repo and a live workspace: the agents get full run of the judgment,
zero run of the consequence.

## The walkthrough, in one breath

Open the room, see the goal and six real tasks tied to real issues. Move
one by button, refresh in another tab, watch it hold. Send a chat message,
see it land for a second teammate. Click "Review risks" — the agent goes
to work, pulling its own evidence and forming its own diagnosis. Read
exactly what it found and exactly what it wants to do. Click approve.
Watch the proposal become real — a task appears, for real, in GitHub and
in Ambiguous both, with a working link back.

## Where it actually stands today

This isn't a mockup being narrated — it's a real, running app. The board,
chat, and review screen are wired to a real database. One member of the
agent team is live and fully verified end to end: the risk/control
specialist, with real reads from GitHub and Ambiguous, a real diagnosis,
and a real proposed task confirmed live this session. CharteringAgent,
StaffingAgent, and the planning/coordination specialists are designed with
named tools but not built yet — the architecture is built to hold a full
team, currently staffed with one. It's still a single demo project, not a
multi-team product yet, and one integration edge is documented rather than
hidden: Ambiguous hands the team back a task ID, not a clickable link.

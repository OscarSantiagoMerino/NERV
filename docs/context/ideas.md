# Ideas Considered

All of these share the same base architecture question: **OpenAI Agents SDK** for
reasoning/tool-calling, **CopilotKit Channels SDK** to sit inside Slack/Teams (fast,
managed integration — see `hackathon.md`), and **Ambiguous AI** for durable records
(tasks/CRM/docs) — now verified fast to set up (~4s via CLI), so it's safe to build
against from the start rather than treating it as a late bolt-on.

**Update:** Auth0 was scouted and dropped — no identified need for async human-approval
or external-API-on-behalf-of-user in any concept below; re-add only if a concept
specifically needs it.

None of these are decided — pick one as a team, or propose another. See `hackathon.md`
for the rubric and prize reasoning behind the tradeoffs below.

## Concept candidates

### 1. Buried question finder
Scans a busy channel, finds a question that got asked and never answered (no reply
chain under it), tags whoever should answer.
- Easiest to build: one signal, no memory across time, easy to fake a convincing demo.
- Rubric fit: obvious value, clearly impossible without real access to channel history.
- Weakest ceiling of the three on Innovation — "found a gap" is good but not surprising.

### 2. Silent commitment tracker
Catches throwaway promises in chat ("I'll send this Friday"), files them, nudges
in-thread if the deadline passes with no follow-up.
- Needs state across time (remembers past promises) — more to build, more to break live.
- Rubric fit: highest ceiling on Innovation and Usefulness if it lands clean.

### 3. New-person catch-up agent
When someone joins a channel mid-project, gives them a real state-of-play — what's
still open, who owns it — pulled from actual history, not a generic summary.
- No cross-time memory needed, but weaker live demo: "a summary" reads flatter than
  "it caught something a human missed."

## Merged pick (currently recommended, see `../hackathon-plan.md`)

### Buried Decision Catcher — #1 crossed with Ambiguous AI's strength
Same trigger as #1 (unanswered decision-shaped question), but the catch doesn't stop
at a Slack reply — if Ambiguous AI is connected, it also files the question as a
task/CRM note, so it becomes a record that outlives the chat.
- Core (Slack-only) is a complete, demoable story on its own.
- Stretch (Ambiguous AI) only adds on top — never blocks the core demo if Ambiguous
  onboarding is slow on the day.
- Targets both "Best Use of CopilotKit" (near-free, core uses Channels SDK anyway) and
  "Best Use of Ambiguous AI" (the DGX Spark, if the stretch layer lands).

## Prize-strategy framing (alternative way to choose)

Instead of choosing by which concept is easiest, choose by which prize pool you're
actually chasing:

- **A — CopilotKit-first**: any of the concepts above, built as a solid general
  Slack submission. Also wins Best Use of CopilotKit near-automatically. Competes
  globally on the main track.
- **B — Ambiguous AI-first**: build the core loop *inside* the Ambiguous AI workspace
  itself (e.g. agent notices a task gone stale relative to related email activity).
  Highest EV if Ambiguous's setup is fast, since it's probably the least-attempted
  bounty — but real risk if onboarding is slow.
- **C — Both, sequenced by risk**: test Ambiguous AI's actual API first thing on
  build day. If fast, build B and bridge it into Slack via CopilotKit (eligible for
  both bounties + main track). If slow, fall back to A immediately — same
  architecture skeleton either way, no time lost rethinking.

Current recommendation is **C**, expressed as the "Buried Decision Catcher" merged
concept above. Given Ambiguous AI is now verified fast, C effectively collapses toward
B from the start of the build, with Slack-only as a fallback rather than the default.

**Independently converged on the same shape:** a parallel working session arrived at
"the decision that got made in Slack but never written down" — same trigger (a
decision-shaped message in a thread), same action (extract → post a card in Slack →
save as a real Ambiguous record), same output. Two independent passes landing on the
same concept is a decent signal it's the right one. Recommendation: go with it.

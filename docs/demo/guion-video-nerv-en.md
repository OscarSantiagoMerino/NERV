# NERV promotional video script

**Target duration:** 1:45-2:00 minutes
**Language:** English
**Status:** Aligned with the implemented MVP on `main`

## Voice-over

Data and analytics projects do not fail only because a model is wrong. They fail when project goals and day-to-day work drift apart. A blocker appears on Monday. The team discovers it weeks later, in a status meeting, when there is little time left to react. The plan lives in one place. The real work lives in GitHub. And no one connects the two.

We built NERV to close that gap.

NERV is an interactive project control room connected to a GitHub repository. This MVP focuses on one critical management loop: project objective, observable work, risk diagnosis, human decision, and traceable action.

Open the room and you see a preloaded Charter: the project's purpose, goal, scope, success criterion, and milestone. The board shows six project tasks linked to GitHub issues. The team can update task progress, preserve those changes, and share context through the project chat.

Then click **Review risks**.

NERV refreshes the GitHub evidence and gives it, together with the Charter, to a dedicated risk specialist powered by a local open model through Ollama. The specialist identifies the blocker that threatens the success criterion, cites the issue behind the finding, explains the impact, and states the limits of its analysis.

Then it proposes a mitigation — and stops.

The proposal is immutable. The lead sees the exact title, body, and evidence that would be published. **Reject** writes nothing. **Approve** first verifies that the evidence has not changed; only then does NERV create a real GitHub issue.

When Ambiguous is configured, the same approved action is also recorded there, using the real identifier returned by its workspace. The new GitHub task appears in **To do**. A second click cannot create a duplicate, and an uncertain response is reconciled instead of blindly retried.

NERV does not claim the risk is solved. It makes the risk visible, the decision explicit, and the action verifiable.

**NERV. From project goals to traceable action.**

## Suggested visual sequence

1. Show the gap between the project plan and the GitHub work.
2. Open the NERV project room and show the preloaded Charter.
3. Show the six tasks on the board and open one linked GitHub issue.
4. Move a task and briefly show the project chat.
5. Click **Review risks**.
6. Highlight the risk finding, goal impact, cited issue, and analysis limitations.
7. Open the immutable mitigation proposal and show its exact contents.
8. Show **Reject** and **Approve and create issue**, emphasizing the human decision.
9. Approve and show the confirmed GitHub issue URL.
10. If available in the recorded run, show the real Ambiguous task identifier.
11. Return to the board and show the new task in **To do**.
12. Close with the NERV name and tagline.

## Claims intentionally excluded

- The unverified claim that 85% of analytics projects never reach production.
- A Chartering, Staffing, and Monitor agent team; these belong to the broader product vision and are not implemented in this MVP.
- Automatic project creation or backlog generation from a plain-language description.
- Continuous monitoring; risk review currently runs on demand.
- Editable Charter, full RACI management, EVM metrics, or bidirectional GitHub synchronization.

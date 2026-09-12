"use client";

import type { Proposal, Review, Snapshot, Task } from "@/contracts/mvp";
import type { WorkspaceControls } from "@/features/workspace/use-workspace";
import type { IntelligenceControls } from "./use-intelligence";

const clock = new Intl.DateTimeFormat("en", { timeStyle: "short" });

// Same format as server/ai/mvp/specialist.ts's proposalMarker() — kept in
// sync manually since that module is server-only (pulls in @openai/agents)
// and shouldn't be imported into a client bundle.
function proposalMarker(proposalId: string): string {
  return `<!-- nerv-proposal:${proposalId} -->`;
}

function SourceTag({ snapshot }: { snapshot: Snapshot | null }) {
  if (snapshot === null) return <span className="ck-tag">GitHub · not read yet</span>;
  return (
    <span className="ck-tag">
      GitHub · {snapshot.mode} · {snapshot.issues.length} issues read
    </span>
  );
}

function Evidence({ review, tasks }: { review: Review; tasks: Task[] }) {
  const cited = review.evidenceTaskIds
    .map((id) => tasks.find((task) => task.id === id))
    .filter((task): task is Task => task !== undefined);

  if (cited.length === 0) {
    return (
      <p className="ck-empty">
        No GitHub issue was cited. The reading rests on the local records alone.
      </p>
    );
  }

  return (
    <ul className="nerv-evidence">
      {cited.map((task) => (
        <li key={task.id}>
          <div className="nerv-evidence-row">
            <strong>{task.title}</strong>
            <span className="nerv-badge nerv-badge--link">
              #{task.github.number} {task.github.state}
            </span>
          </div>
          <p className="ck-muted">
            {task.github.labels.length > 0 ? `Labels ${task.github.labels.join(", ")} · ` : ""}
            updated {task.github.updatedAt}
            {" · "}
            <a href={task.github.url} target="_blank" rel="noreferrer">
              open on GitHub
            </a>
          </p>
        </li>
      ))}
    </ul>
  );
}

function ReviewCard({
  review,
  intelligence,
  workspace,
}: {
  review: Review;
  intelligence: IntelligenceControls;
  workspace: WorkspaceControls;
}) {
  const busy = intelligence.busy !== null;

  return (
    <div className="nerv-review">
      <header className="nerv-review-head">
        <div>
          <h3>Risk review</h3>
          <p className="ck-muted">{clock.format(new Date(review.createdAt))}</p>
        </div>
        <SourceTag snapshot={intelligence.snapshot} />
      </header>

      <section className="nerv-review-block">
        <h4>What this threatens</h4>
        <p className="nerv-goal">{review.goalImpact}</p>
      </section>

      <section className="nerv-review-block">
        <h4>Finding</h4>
        <p className="ck-preserve-lines">{review.summary}</p>
      </section>

      <section className="nerv-review-block">
        <h4>Evidence read from GitHub</h4>
        <Evidence review={review} tasks={workspace.tasks} />
      </section>

      {review.limitations.length > 0 ? (
        <section className="nerv-review-block">
          <h4>Limits of this reading</h4>
          <ul className="nerv-limits">
            {review.limitations.map((item) => (
              <li key={item}>
                <span className="nerv-kind">Limit</span> {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="nerv-review-actions">
        {intelligence.proposal === null ? null : (
          <button
            type="button"
            className="ck-btn ck-btn--primary"
            onClick={() => intelligence.setStage("proposal")}
          >
            View proposal
          </button>
        )}
        <button
          type="button"
          className="ck-btn"
          disabled={busy}
          onClick={() => void intelligence.runReview()}
        >
          {intelligence.busy === "review" ? "Reviewing…" : "Review again"}
        </button>
        <span className="ck-muted nerv-note">Nothing has been written to GitHub.</span>
      </div>

      {intelligence.proposal === null ? (
        <p className="ck-empty">
          No mitigation was proposed: the evidence does not support one. Record what is missing
          and review again.
        </p>
      ) : null}
    </div>
  );
}

function ProposalCard({
  proposal,
  review,
  intelligence,
  workspace,
}: {
  proposal: Proposal;
  review: Review;
  intelligence: IntelligenceControls;
  workspace: WorkspaceControls;
}) {
  const isLead = workspace.viewer?.id === "profile-lead";
  const busy = intelligence.busy !== null;
  const cited = proposal.evidenceTaskIds
    .map((id) => workspace.tasks.find((task) => task.id === id))
    .filter((task): task is Task => task !== undefined);

  return (
    <div className="nerv-review">
      <header className="nerv-review-head">
        <div>
          <h3>Proposed mitigation</h3>
          <p className="ck-muted">
            From the {clock.format(new Date(review.createdAt))} risk review · {proposal.status} ·
            version {proposal.version}
          </p>
        </div>
        <span className="ck-tag">Not created yet</span>
      </header>

      <section className="nerv-review-block">
        <h4>Why this action</h4>
        <p>{proposal.rationale}</p>
      </section>

      <section className="nerv-review-block">
        <h4>Issue that will be created, exactly as written</h4>
        <div className="nerv-issue">
          <div className="nerv-issue-head">
            <strong>{proposal.payload.title}</strong>
            <span className="ck-muted">{workspace.project.repo}</span>
          </div>
          <pre className="nerv-issue-body">{proposal.payload.body}</pre>
        </div>
      </section>

      <section className="nerv-review-block">
        <h4>Evidence carried into the issue</h4>
        {cited.length === 0 ? (
          <p className="ck-empty">None cited.</p>
        ) : (
          <div className="nerv-badges">
            {cited.map((task) => (
              <span key={task.id} className="nerv-badge nerv-badge--link">
                #{task.github.number} {task.github.state}
              </span>
            ))}
            <span className="nerv-badge">snapshot {intelligence.snapshot?.mode ?? "unknown"}</span>
          </div>
        )}
      </section>

      <p className="nerv-lock">
        This text cannot be edited here. To change it, reject the proposal and run the review
        again — approving always publishes the version you are reading.
      </p>

      <div className="nerv-review-actions">
        <button
          type="button"
          className="ck-btn ck-btn--primary"
          disabled={!isLead || busy || proposal.status !== "pending"}
          onClick={() => void intelligence.decide(proposal, "approve")}
        >
          {intelligence.busy === "decide" ? "Working…" : "Approve and create issue"}
        </button>
        <button
          type="button"
          className="ck-btn"
          disabled={!isLead || busy || proposal.status !== "pending"}
          onClick={() => void intelligence.decide(proposal, "reject")}
        >
          Reject
        </button>
        <button type="button" className="ck-btn" onClick={() => intelligence.setStage("review")}>
          Back to review
        </button>
      </div>
      <p className="ck-muted nerv-note">
        {isLead
          ? "Lead only · rejecting writes nothing"
          : `Only the lead can approve. You are acting as ${workspace.viewer?.name ?? "unknown"}.`}
      </p>
    </div>
  );
}

function AppliedCard({
  proposal,
  intelligence,
  workspace,
}: {
  proposal: Proposal;
  intelligence: IntelligenceControls;
  workspace: WorkspaceControls;
}) {
  const result = proposal.result;
  const card = workspace.tasks.find((task) => task.github.number === result?.number);

  return (
    <div className="nerv-review">
      <header className="nerv-review-head">
        <div>
          <h3>Issue created</h3>
          <p className="ck-muted">
            Approved by {workspace.profileName(proposal.approvedByDemoProfileId)}
            {proposal.approvedAt === null ? "" : ` · ${clock.format(new Date(proposal.approvedAt))}`}
          </p>
        </div>
        <span className="ck-tag">applied</span>
      </header>

      <div className="nerv-applied">
        <strong>
          #{result?.number} — {proposal.payload.title}
        </strong>
        <p className="ck-muted">Confirmed by GitHub: number, URL and repository all match the approved text.</p>
      </div>

      {proposal.ambiguous !== null ? (
        <section className="nerv-review-block">
          <h4>Also recorded in Ambiguous</h4>
          <p>
            {proposal.ambiguous.url !== null ? (
              <a href={proposal.ambiguous.url} target="_blank" rel="noreferrer">
                {proposal.ambiguous.url}
              </a>
            ) : (
              <span>{proposal.ambiguous.taskKey ?? proposal.ambiguous.recordId}</span>
            )}
          </p>
        </section>
      ) : null}

      <section className="nerv-review-block">
        <h4>Open it and check</h4>
        {result === null ? (
          <p className="ck-empty">No URL was recorded.</p>
        ) : (
          <p>
            <a href={result.url} target="_blank" rel="noreferrer">
              {result.url}
            </a>
          </p>
        )}
      </section>

      <section className="nerv-review-block">
        <h4>Now on the board, in To do</h4>
        {card === undefined ? (
          <p className="ck-empty">The card will appear on the next sync.</p>
        ) : (
          <button
            type="button"
            className="ck-btn"
            onClick={() => {
              workspace.setView("board");
              workspace.selectTask(card.id);
            }}
          >
            Open {card.title}
          </button>
        )}
        <p className="ck-muted nerv-note">
          No GitHub assignee is set automatically. A person picks the owner and the date.
        </p>
      </section>

      <p className="ck-muted nerv-note">
        This proposal cannot be approved again — a second click returns this same result instead
        of creating another issue. The risk stays open until someone records evidence that it is
        actually resolved.
      </p>

      <div className="nerv-review-actions">
        <button
          type="button"
          className="ck-btn"
          disabled={intelligence.busy !== null}
          onClick={() => void intelligence.runReview()}
        >
          Review again
        </button>
      </div>
    </div>
  );
}

function UncertainCard({
  proposal,
  intelligence,
  workspace,
}: {
  proposal: Proposal;
  intelligence: IntelligenceControls;
  workspace: WorkspaceControls;
}) {
  return (
    <div className="nerv-review">
      <header className="nerv-review-head">
        <div>
          <h3>Result not established</h3>
          <p className="ck-muted">Approved · request sent</p>
        </div>
        <span className="ck-tag">uncertain</span>
      </header>

      <p className="ck-error" role="status">
        <strong>{proposal.error?.message ?? "GitHub did not answer in time."}</strong> The request
        was sent, so the issue may or may not exist. NERV will not send it again on its own.
      </p>

      <section className="nerv-review-block">
        <h4>What happens next</h4>
        <ol className="nerv-steps">
          <li>
            <strong>Sync</strong> searches the repository for this proposal&apos;s marker. If the
            issue is there, NERV records the result and adds the card.
          </li>
          <li>Not finding it in a partial read does not prove it is absent, so the state stays uncertain rather than flipping to failed.</li>
          <li>If it cannot be settled, open the repository and check by hand.</li>
        </ol>
      </section>

      <section className="nerv-review-block">
        <h4>Marker to search for</h4>
        <p className="nerv-marker">{proposalMarker(proposal.id)}</p>
      </section>

      <div className="nerv-review-actions">
        <button
          type="button"
          className="ck-btn"
          disabled={intelligence.busy !== null}
          onClick={() => void intelligence.sync()}
        >
          {intelligence.busy === "sync" ? "Syncing…" : "Sync and reconcile"}
        </button>
        <a
          className="ck-btn"
          href={`https://github.com/${workspace.project.repo}/issues`}
          target="_blank"
          rel="noreferrer"
        >
          Open repository
        </a>
        <button type="button" className="ck-btn" disabled>
          Approve and create issue
        </button>
      </div>
      <p className="ck-muted nerv-note">Approving is disabled for this proposal so a retry cannot create a duplicate.</p>
    </div>
  );
}

function ClosedCard({ proposal, intelligence }: { proposal: Proposal; intelligence: IntelligenceControls }) {
  const rejected = proposal.status === "rejected";
  return (
    <div className="nerv-review">
      <header className="nerv-review-head">
        <div>
          <h3>{rejected ? "Proposal rejected" : "Not created"}</h3>
          <p className="ck-muted">
            {rejected ? "Nothing was written to GitHub." : (proposal.error?.message ?? "GitHub refused the request.")}
          </p>
        </div>
        <span className="ck-tag">{proposal.status}</span>
      </header>
      <p className="ck-muted">
        The proposal text is fixed. To change the mitigation, run the review again and read the
        new one before approving.
      </p>
      <div className="nerv-review-actions">
        <button
          type="button"
          className="ck-btn ck-btn--primary"
          disabled={intelligence.busy !== null}
          onClick={() => void intelligence.runReview()}
        >
          {intelligence.busy === "review" ? "Reviewing…" : "Review again"}
        </button>
      </div>
    </div>
  );
}

export function ReviewPanel({
  intelligence,
  workspace,
}: {
  intelligence: IntelligenceControls;
  workspace: WorkspaceControls;
}) {
  const { review, proposal } = intelligence;

  const body = (() => {
    if (review === null) {
      return (
        <div className="nerv-assist-cta">
          <h3>Risk specialist</h3>
          <p>
            Reads the charter and the latest GitHub snapshot, then explains what threatens the
            goal. It proposes; it never publishes.
          </p>
          <div>
            <button
              type="button"
              className="ck-btn ck-btn--primary"
              disabled={intelligence.busy !== null}
              onClick={() => void intelligence.runReview()}
            >
              {intelligence.busy === "review" ? "Reviewing…" : "Review risks"}
            </button>
          </div>
        </div>
      );
    }

    if (proposal !== null) {
      if (proposal.status === "applied") {
        return <AppliedCard proposal={proposal} intelligence={intelligence} workspace={workspace} />;
      }
      if (proposal.status === "uncertain" || proposal.status === "executing") {
        return <UncertainCard proposal={proposal} intelligence={intelligence} workspace={workspace} />;
      }
      if (proposal.status === "rejected" || proposal.status === "failed") {
        return <ClosedCard proposal={proposal} intelligence={intelligence} />;
      }
      if (intelligence.stage === "proposal") {
        return <ProposalCard proposal={proposal} review={review} intelligence={intelligence} workspace={workspace} />;
      }
    }

    return <ReviewCard review={review} intelligence={intelligence} workspace={workspace} />;
  })();

  return (
    <div className="nerv-review-panel">
      {intelligence.notice === null ? null : (
        <p className="ck-error" role="alert">
          {intelligence.notice}{" "}
          <button type="button" className="ck-btn ck-btn--tiny" onClick={intelligence.dismissNotice}>
            Dismiss
          </button>
        </p>
      )}
      {body}
    </div>
  );
}

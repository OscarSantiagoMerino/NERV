"use client";

import type { IntelligenceControls } from "@/features/intelligence/use-intelligence";
import type { WorkspaceControls } from "./use-workspace";
import { WORKFLOW_STATES } from "./constants";
import type { Task, WorkflowState } from "@/contracts/mvp";

const COLUMN_LABEL: Record<WorkflowState, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

function TaskCard({ task, workspace }: { task: Task; workspace: WorkspaceControls }) {
  const index = WORKFLOW_STATES.indexOf(task.workflowState);
  const previous = WORKFLOW_STATES[index - 1];
  const next = WORKFLOW_STATES[index + 1];
  const selected = workspace.selectedTask?.id === task.id;
  const blocked = task.github.labels.includes("blocked");

  return (
    <article className={`nerv-card${selected ? " nerv-card--selected" : ""}`}>
      <button
        type="button"
        className="nerv-card-title"
        onClick={() => workspace.selectTask(selected ? null : task.id)}
        aria-expanded={selected}
      >
        {task.title}
      </button>

      <div className="nerv-badges">
        {blocked ? <span className="nerv-badge nerv-badge--alert">Blocked</span> : null}
        <span className="nerv-badge nerv-badge--link">
          #{task.github.number} {task.github.state}
        </span>
      </div>

      <dl className="nerv-card-facts">
        <div>
          <dt>Owner</dt>
          <dd>{workspace.profileName(task.ownerProfileId)}</dd>
        </div>
      </dl>

      {selected ? (
        <div className="nerv-card-detail">
          <p>{task.body.length > 0 ? task.body : "No description."}</p>
          <p>
            <a href={task.github.url} target="_blank" rel="noreferrer">
              View issue #{task.github.number} on GitHub
            </a>
          </p>
        </div>
      ) : null}

      <div className="nerv-card-actions">
        <button
          type="button"
          className="ck-btn ck-btn--tiny"
          disabled={previous === undefined || workspace.saving}
          onClick={() => previous !== undefined && void workspace.moveTask(task.id, previous)}
        >
          ← {previous === undefined ? "" : COLUMN_LABEL[previous]}
        </button>
        <button
          type="button"
          className="ck-btn ck-btn--tiny"
          disabled={next === undefined || workspace.saving}
          onClick={() => next !== undefined && void workspace.moveTask(task.id, next)}
        >
          {next === undefined ? "" : COLUMN_LABEL[next]} →
        </button>
      </div>
    </article>
  );
}

function SourceTag({ intelligence }: { intelligence: IntelligenceControls }) {
  const { snapshot } = intelligence;
  if (snapshot === null) return <span className="ck-tag">GitHub · not read yet</span>;
  const read = new Date(snapshot.fetchedAt);
  return (
    <span className="ck-tag">
      GitHub · {snapshot.mode} · read {new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(read)}
    </span>
  );
}

export function Board({
  workspace,
  intelligence,
}: {
  workspace: WorkspaceControls;
  intelligence: IntelligenceControls;
}) {
  return (
    <section className="ck-panel" aria-labelledby="board-title">
      <header className="nerv-section-header">
        <h2 id="board-title">Board</h2>
        <div className="nerv-header-actions">
          <SourceTag intelligence={intelligence} />
          <button
            type="button"
            className="ck-btn"
            disabled={intelligence.busy !== null}
            onClick={() => void intelligence.sync()}
          >
            {intelligence.busy === "sync" ? "Syncing…" : "Sync"}
          </button>
        </div>
      </header>

      <div className="nerv-columns">
        {WORKFLOW_STATES.map((state) => {
          const column = workspace.tasks.filter((task) => task.workflowState === state);
          return (
            <div key={state} className="nerv-column">
              <h3>
                {COLUMN_LABEL[state]} <span className="ck-muted">{column.length}</span>
              </h3>
              {column.length === 0 ? (
                <p className="ck-empty">Nothing here.</p>
              ) : (
                column.map((task) => <TaskCard key={task.id} task={task} workspace={workspace} />)
              )}
              {state === "done" ? (
                <p className="ck-empty">Moving a card here does not close its GitHub issue.</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

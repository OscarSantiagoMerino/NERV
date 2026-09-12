"use client";

import { useState } from "react";
import type { IntelligenceControls } from "@/features/intelligence/use-intelligence";
import type { WorkspaceControls } from "./use-workspace";
import { WORKFLOW_STATES } from "./constants";
import type { Task } from "@/contracts/schemas";

type WorkflowState = Task["workflowState"];

const COLUMN_LABEL: Record<WorkflowState, string> = {
  todo: "To do",
  doing: "In progress",
  done: "Done",
};

function formatDue(dueAt: string | null, timeZone: string): string {
  if (dueAt === null) return "No date set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone,
  }).format(new Date(dueAt));
}

function TaskCard({
  task,
  workspace,
}: {
  task: Task;
  workspace: WorkspaceControls;
}) {
  const index = WORKFLOW_STATES.indexOf(task.workflowState);
  const previous = WORKFLOW_STATES[index - 1];
  const next = WORKFLOW_STATES[index + 1];
  const milestone = workspace.project.milestones.find(
    (candidate) => candidate.id === task.milestoneId,
  );
  const selected = workspace.selectedTask?.id === task.id;

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
        {task.blocked ? <span className="nerv-badge nerv-badge--alert">Blocked</span> : null}
        <span className="nerv-badge">
          {milestone === undefined ? "Unplanned" : milestone.title}
        </span>
        {task.githubIssueNumber === null ? null : (
          <span className="nerv-badge nerv-badge--link">
            #{task.githubIssueNumber} {task.githubState ?? "unread"}
          </span>
        )}
      </div>

      <dl className="nerv-card-facts">
        <div>
          <dt>Responsible</dt>
          <dd>{workspace.memberName(task.responsibleId)}</dd>
        </div>
        <div>
          <dt>Due</dt>
          <dd>{formatDue(task.dueAt, workspace.viewer.timeZone)}</dd>
        </div>
      </dl>

      {selected ? (
        <div className="nerv-card-detail">
          <p>{task.description.length > 0 ? task.description : "No description."}</p>
          <h4>Acceptance criteria</h4>
          <p>
            {task.acceptanceCriteria.length > 0
              ? task.acceptanceCriteria
              : "None recorded."}
          </p>
          {task.githubUrl === null ? null : (
            <p>
              <a href={task.githubUrl} target="_blank" rel="noreferrer">
                View issue #{task.githubIssueNumber} on GitHub
              </a>
            </p>
          )}
          <label>
            Reassign
            <select
              value={task.responsibleId ?? ""}
              onChange={(event) =>
                void workspace.assignTask(
                  task.id,
                  event.target.value === "" ? null : event.target.value,
                )
              }
            >
              <option value="">Unassigned</option>
              {workspace.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="nerv-card-actions">
        <button
          type="button"
          className="ck-btn ck-btn--tiny"
          disabled={previous === undefined || workspace.saving}
          onClick={() => void workspace.moveTask(task.id, previous)}
        >
          ← {previous === undefined ? "" : COLUMN_LABEL[previous]}
        </button>
        <button
          type="button"
          className="ck-btn ck-btn--tiny"
          disabled={next === undefined || workspace.saving}
          onClick={() => void workspace.moveTask(task.id, next)}
        >
          {next === undefined ? "" : COLUMN_LABEL[next]} →
        </button>
      </div>
    </article>
  );
}

function NewTaskForm({ workspace }: { workspace: WorkspaceControls }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [responsibleId, setResponsibleId] = useState("");

  if (!open) {
    return (
      <button type="button" className="ck-btn" onClick={() => setOpen(true)}>
        New task
      </button>
    );
  }

  return (
    <form
      className="nerv-new-task"
      onSubmit={(event) => {
        event.preventDefault();
        if (title.trim().length === 0) return;
        void workspace.addTask({
          title: title.trim(),
          description: "",
          acceptanceCriteria: "",
          milestoneId: milestoneId === "" ? null : milestoneId,
          responsibleId: responsibleId === "" ? null : responsibleId,
        });
        setTitle("");
        setOpen(false);
      }}
    >
      <label>
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          required
        />
      </label>
      <label>
        Milestone
        <select value={milestoneId} onChange={(event) => setMilestoneId(event.target.value)}>
          <option value="">Unplanned</option>
          {workspace.project.milestones.map((milestone) => (
            <option key={milestone.id} value={milestone.id}>
              {milestone.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Responsible
        <select
          value={responsibleId}
          onChange={(event) => setResponsibleId(event.target.value)}
        >
          <option value="">Unassigned</option>
          {workspace.members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
            </option>
          ))}
        </select>
      </label>
      <div className="nerv-form-actions">
        <button type="submit" className="ck-btn ck-btn--primary" disabled={workspace.saving}>
          Create
        </button>
        <button type="button" className="ck-btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function SourceTag({ intelligence }: { intelligence: IntelligenceControls }) {
  const { snapshot } = intelligence;
  if (snapshot === null) return <span className="ck-tag">GitHub · not read yet</span>;
  const read = new Date(snapshot.fetchedAt);
  return (
    <span className="ck-tag">
      GitHub · {snapshot.mode} · read{" "}
      {new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(read)}
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
          <NewTaskForm workspace={workspace} />
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
                column.map((task) => (
                  <TaskCard key={task.id} task={task} workspace={workspace} />
                ))
              )}
              {state === "done" ? (
                <p className="ck-empty">
                  Moving a card here does not close its GitHub issue.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

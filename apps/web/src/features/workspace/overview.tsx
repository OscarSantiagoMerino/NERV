"use client";

import type { WorkspaceControls } from "./use-workspace";
import type { Task } from "@/contracts/mvp";

export function deliveryProgress(tasks: Task[]): number | null {
  if (tasks.length === 0) return null;
  const completed = tasks.filter((task) => task.workflowState === "done").length;
  return (completed / tasks.length) * 100;
}

export function Overview({ workspace }: { workspace: WorkspaceControls }) {
  const { project, tasks } = workspace;
  const progress = deliveryProgress(tasks);
  const blocked = tasks.filter((task) => task.github.labels.includes("blocked")).length;

  return (
    <section className="ck-panel" aria-labelledby="overview-title">
      <header className="nerv-section-header">
        <h2 id="overview-title">Charter &amp; plan</h2>
      </header>

      <div className="nerv-metrics">
        <div className="ck-card">
          <p className="ck-eyebrow">Delivery progress</p>
          <strong>{progress === null ? "No data" : `${Math.round(progress)}%`}</strong>
          <p className="ck-muted">Completed tasks</p>
        </div>
        <div className="ck-card">
          <p className="ck-eyebrow">Blocked</p>
          <strong>{blocked}</strong>
          <p className="ck-muted">Flagged by GitHub labels</p>
        </div>
      </div>

      <div className="nerv-charter">
        <h3>{project.title}</h3>
        <p>{project.purpose}</p>
        <div className="nerv-charter-grid">
          <div>
            <h4>Goal</h4>
            <p>{project.goal}</p>
          </div>
          <div>
            <h4>Scope</h4>
            <p>{project.scope}</p>
          </div>
          <div>
            <h4>Success criterion</h4>
            <p>{project.successCriterion}</p>
          </div>
        </div>
      </div>

      <div className="nerv-raci">
        <h3>Milestone</h3>
        <p>
          <strong>{project.milestone.title}</strong> · accountable:{" "}
          {workspace.profileName(project.milestone.accountableProfileId)}
        </p>
        <p className="ck-muted">Read-only in this MVP.</p>
      </div>
    </section>
  );
}

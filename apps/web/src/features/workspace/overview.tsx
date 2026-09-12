"use client";

import type { WorkspaceControls } from "./use-workspace";
import type { Task } from "./types";

export function deliveryProgress(tasks: Task[]): number | null {
  const planned = tasks.filter((task) => task.milestoneId !== null);
  if (planned.length === 0) return null;
  const completed = planned.filter((task) => task.workflowState === "done").length;
  return (completed / planned.length) * 100;
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4>{title}</h4>
      {items.length === 0 ? (
        <p className="ck-empty">None recorded.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Overview({ workspace }: { workspace: WorkspaceControls }) {
  const { project, tasks } = workspace;
  const { charter, objective, kpi } = project;
  const progress = deliveryProgress(tasks);
  const overdue = tasks.filter(
    (task) =>
      task.dueAt !== null &&
      task.workflowState !== "done" &&
      new Date(task.dueAt).getTime() < Date.now(),
  ).length;
  const blocked = tasks.filter((task) => task.blocked).length;

  return (
    <section className="ck-panel" aria-labelledby="overview-title">
      <header className="nerv-section-header">
        <h2 id="overview-title">Charter &amp; plan</h2>
        <span className="ck-status-label">{charter.status}</span>
      </header>

      <div className="nerv-metrics">
        <div className="ck-card">
          <p className="ck-eyebrow">Delivery progress</p>
          <strong>{progress === null ? "No data" : `${Math.round(progress)}%`}</strong>
          <p className="ck-muted">Completed planned tasks</p>
        </div>
        <div className="ck-card">
          <p className="ck-eyebrow">Overdue</p>
          <strong>{overdue}</strong>
          <p className="ck-muted">Open tasks past their date</p>
        </div>
        <div className="ck-card">
          <p className="ck-eyebrow">Blocked</p>
          <strong>{blocked}</strong>
          <p className="ck-muted">Flagged by the team</p>
        </div>
        <div className="ck-card">
          <p className="ck-eyebrow">{kpi.name}</p>
          <strong>
            {kpi.current === null ? "No data" : `${kpi.current} / ${kpi.target}`}
          </strong>
          <p className="ck-muted">
            {kpi.source === null ? "No measurement recorded" : kpi.source}
          </p>
        </div>
      </div>

      <div className="nerv-objective">
        <h3>Objective</h3>
        <p>{objective.statement}</p>
        <p className="ck-muted">Owner: {workspace.memberName(objective.ownerMemberId)}</p>
      </div>

      <div className="nerv-charter">
        <h3>Purpose</h3>
        <p>{charter.purpose}</p>
        <div className="nerv-charter-grid">
          <List title="In scope" items={charter.scopeIn} />
          <List title="Out of scope" items={charter.scopeOut} />
          <List title="Deliverables" items={charter.deliverables} />
          <List title="Constraints" items={charter.constraints} />
          <List title="Assumptions" items={charter.assumptions} />
          <List title="Success criteria" items={charter.successCriteria} />
        </div>
        <p className="ck-muted">
          Sponsor: {charter.sponsorName} · Lead: {workspace.memberName(charter.leadMemberId)}
        </p>
      </div>

      <div className="nerv-raci">
        <h3>Milestones and RACI</h3>
        <table>
          <thead>
            <tr>
              <th scope="col">Milestone</th>
              <th scope="col">Accountable</th>
              <th scope="col">Responsible</th>
              <th scope="col">Consulted</th>
              <th scope="col">Informed</th>
            </tr>
          </thead>
          <tbody>
            {project.milestones.map((milestone) => (
              <tr key={milestone.id}>
                <th scope="row">{milestone.title}</th>
                <td>{workspace.memberName(milestone.raci.accountableId)}</td>
                <td>{milestone.raci.responsibleIds.map(workspace.memberName).join(", ")}</td>
                <td>
                  {milestone.raci.consultedIds.length === 0
                    ? "—"
                    : milestone.raci.consultedIds.map(workspace.memberName).join(", ")}
                </td>
                <td>
                  {milestone.raci.informedIds.length === 0
                    ? "—"
                    : milestone.raci.informedIds.map(workspace.memberName).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="ck-muted">
          Read-only until P2 delivers the editable Charter and RACI panel.
        </p>
      </div>
    </section>
  );
}

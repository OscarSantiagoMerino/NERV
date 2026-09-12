"use client";

import { CopilotChat } from "@copilotkit/react-core/v2";
import { Board } from "@/features/workspace/board";
import { Overview } from "@/features/workspace/overview";
import { TeamChat } from "@/features/workspace/team-chat";
import { WorkspaceControl } from "@/features/workspace/workspace-control";
import { useWorkspace, type WorkspaceView } from "@/features/workspace/use-workspace";
import type { Member, Store } from "@/contracts/schemas";

const NAV: { view: WorkspaceView; label: string }[] = [
  { view: "overview", label: "Charter & plan" },
  { view: "board", label: "Board" },
  { view: "team", label: "Team chat" },
];

export function Room({ store, viewer }: { store: Store; viewer: Member }) {
  const workspace = useWorkspace(store, viewer);

  return (
    <>
      <WorkspaceControl workspace={workspace} />

      <main className="ck-workspace nerv-room">
        <header className="ck-workspace-header">
          <div>
            <p className="ck-eyebrow">NERV · project room</p>
            <h1>{workspace.project.name}</h1>
            <p className="ck-intro">{workspace.project.objective.statement}</p>
          </div>
          <div className="nerv-identity">
            <label htmlFor="actor-select">Acting as</label>
            <select
              id="actor-select"
              value={workspace.viewer.id}
              disabled={workspace.saving}
              onChange={(event) => void workspace.switchViewer(event.target.value)}
            >
              {workspace.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName} · {member.accessRole}
                </option>
              ))}
            </select>
            <p className="ck-muted">Local demo · sample profiles, not authenticated users.</p>
          </div>
        </header>

        <nav className="nerv-nav" aria-label="Project room">
          {NAV.map((item) => (
            <button
              key={item.view}
              type="button"
              className={`ck-btn${workspace.view === item.view ? " ck-btn--primary" : ""}`}
              aria-current={workspace.view === item.view}
              onClick={() => workspace.setView(item.view)}
            >
              {item.label}
            </button>
          ))}
          <span className="nerv-status" role="status">
            {workspace.saving ? "Saving…" : "Saved"}
          </span>
        </nav>

        {workspace.notice === null ? null : (
          <p className="ck-error" role="alert">
            {workspace.notice}{" "}
            <button type="button" className="ck-btn ck-btn--tiny" onClick={workspace.dismissNotice}>
              Dismiss
            </button>
          </p>
        )}

        <div className="ck-workspace-grid nerv-grid">
          {workspace.view === "overview" ? <Overview workspace={workspace} /> : null}
          {workspace.view === "board" ? <Board workspace={workspace} /> : null}
          {workspace.view === "team" ? <TeamChat workspace={workspace} /> : null}

          <section className="ck-panel ck-assistant" aria-labelledby="assistant-title">
            <header className="ck-assistant-header">
              <h2 id="assistant-title">Project assistant</h2>
              <p>It reads this room and can open panels. It never saves on its own.</p>
            </header>
            <CopilotChat
              className="ck-chat"
              labels={{
                welcomeMessageText: "What needs attention in this project?",
                chatInputPlaceholder: "Ask about the plan, the board or a blocker…",
              }}
            />
          </section>
        </div>
      </main>
    </>
  );
}

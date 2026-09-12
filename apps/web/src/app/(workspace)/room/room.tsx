"use client";

import { useCallback, useEffect, useState } from "react";
import { ReviewPanel } from "@/features/intelligence/review-panel";
import { useIntelligence } from "@/features/intelligence/use-intelligence";
import { Board } from "@/features/workspace/board";
import { Overview } from "@/features/workspace/overview";
import { TeamChat } from "@/features/workspace/team-chat";
import { useWorkspace, type WorkspaceView } from "@/features/workspace/use-workspace";
import type { DemoProfile, DemoState } from "@/contracts/mvp";

const NAV: { view: WorkspaceView; label: string }[] = [
  { view: "overview", label: "Charter & plan" },
  { view: "board", label: "Board" },
  { view: "team", label: "Team chat" },
];

const PROFILE_STORAGE_KEY = "nerv-demo-profile";

type Boot =
  | { stage: "loading" }
  | { stage: "pick-profile"; profiles: DemoProfile[] }
  | { stage: "ready"; state: DemoState }
  | { stage: "error"; message: string };

async function fetchJson<T>(
  path: string,
  profileId?: string,
): Promise<{ data: T } | { error: { message: string } }> {
  const response = await fetch(path, {
    headers: { "X-Nerv-Demo": "1", ...(profileId ? { "X-Nerv-Profile": profileId } : {}) },
  });
  const body = await response.json().catch(() => null);
  if (body === null) return { error: { message: "Unreadable response from the server." } };
  if (!response.ok) {
    const message = body && "error" in body ? (body.error?.message ?? null) : null;
    return { error: { message: message ?? "Request failed." } };
  }
  return body;
}

export function Room() {
  const [boot, setBoot] = useState<Boot>({ stage: "loading" });

  const load = useCallback(async (profileId: string) => {
    setBoot({ stage: "loading" });
    const result = await fetchJson<DemoState>("/api/mvp/state", profileId);
    if ("error" in result) {
      setBoot({ stage: "error", message: result.error.message });
      return;
    }
    window.sessionStorage.setItem(PROFILE_STORAGE_KEY, profileId);
    setBoot({ stage: "ready", state: result.data });
  }, []);

  useEffect(() => {
    (async () => {
      const stored = window.sessionStorage.getItem(PROFILE_STORAGE_KEY);
      const sessionResult = await fetchJson<{ demoMode: true; profiles: DemoProfile[] }>(
        "/api/mvp/session",
      );
      if ("error" in sessionResult) {
        setBoot({ stage: "error", message: sessionResult.error.message });
        return;
      }
      const { profiles } = sessionResult.data;
      if (stored && profiles.some((p) => p.id === stored)) {
        await load(stored);
      } else {
        setBoot({ stage: "pick-profile", profiles });
      }
    })();
  }, [load]);

  if (boot.stage === "loading") {
    return (
      <main className="ck-workspace">
        <p className="ck-intro">Loading the project room…</p>
      </main>
    );
  }

  if (boot.stage === "error") {
    return (
      <main className="ck-workspace">
        <h1>NERV</h1>
        <p className="ck-error" role="alert">
          {boot.message}
        </p>
      </main>
    );
  }

  if (boot.stage === "pick-profile") {
    return (
      <main className="ck-workspace">
        <h1>NERV</h1>
        <p className="ck-intro">Pick a demo profile before opening the project room.</p>
        <p className="ck-muted">Local demo · sample profiles, not authenticated users.</p>
        <div className="nerv-header-actions">
          {boot.profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className="ck-btn ck-btn--primary"
              onClick={() => void load(profile.id)}
            >
              {profile.name} · {profile.roleLabel}
            </button>
          ))}
        </div>
      </main>
    );
  }

  return <RoomView initial={boot.state} />;
}

function RoomView({ initial }: { initial: DemoState }) {
  const workspace = useWorkspace(initial);
  const intelligence = useIntelligence(
    { snapshot: initial.snapshot, reviews: initial.reviews, proposals: initial.proposals },
    () => workspace.viewer?.id ?? initial.profiles[0].id,
    workspace.refresh,
  );

  return (
    <>
      <main className="ck-workspace nerv-room">
        <header className="ck-workspace-header">
          <div>
            <p className="ck-eyebrow">NERV · project room</p>
            <h1>{workspace.project.title}</h1>
            <p className="ck-intro">{workspace.project.goal}</p>
          </div>
          <div className="nerv-identity">
            <label htmlFor="actor-select">Acting as</label>
            <select
              id="actor-select"
              value={workspace.viewer?.id ?? ""}
              disabled={workspace.saving}
              onChange={(event) => workspace.switchProfile(event.target.value)}
            >
              {workspace.profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} · {profile.roleLabel}
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
          {workspace.view === "board" ? (
            <Board workspace={workspace} intelligence={intelligence} />
          ) : null}
          {workspace.view === "team" ? <TeamChat workspace={workspace} /> : null}

          <section className="ck-panel ck-assistant" aria-labelledby="assistant-title">
            <header className="ck-assistant-header">
              <h2 id="assistant-title">Project assistant</h2>
              <p>Reads GitHub as evidence and proposes; it never publishes on its own.</p>
            </header>
            <ReviewPanel intelligence={intelligence} workspace={workspace} />
          </section>
        </div>
      </main>
    </>
  );
}

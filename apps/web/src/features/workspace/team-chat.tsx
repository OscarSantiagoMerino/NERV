"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkspaceControls } from "./use-workspace";
import { MESSAGE_MAX_LENGTH } from "./types";

export function TeamChat({ workspace }: { workspace: WorkspaceControls }) {
  const [draft, setDraft] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [workspace.messages.length]);

  const time = new Intl.DateTimeFormat("en", {
    timeStyle: "short",
    timeZone: workspace.actor.timeZone,
  });

  return (
    <section className="ck-panel nerv-chat" aria-labelledby="team-chat-title">
      <header className="nerv-section-header">
        <h2 id="team-chat-title">Team chat</h2>
        <span className="ck-tag">{workspace.actor.timeZone}</span>
      </header>

      <div className="ck-scroll nerv-chat-log">
        {workspace.messages.length === 0 ? (
          <p className="ck-empty">No messages yet.</p>
        ) : (
          workspace.messages.map((message) => (
            <article key={message.id} className="nerv-message">
              <header>
                <strong>{workspace.memberName(message.authorMemberId)}</strong>
                <time dateTime={message.createdAt}>{time.format(new Date(message.createdAt))}</time>
              </header>
              <p className="ck-preserve-lines">{message.text}</p>
            </article>
          ))
        )}
        <div ref={bottom} />
      </div>

      <form
        className="nerv-chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (text.length === 0) return;
          void workspace.sendMessage(text);
          setDraft("");
        }}
      >
        <label className="ck-sr-only" htmlFor="chat-input">
          Message
        </label>
        <textarea
          id="chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MESSAGE_MAX_LENGTH}
          rows={2}
          placeholder={`Message the team as ${workspace.actor.displayName}…`}
        />
        <button
          type="submit"
          className="ck-btn ck-btn--primary"
          disabled={workspace.saving || draft.trim().length === 0}
        >
          Send
        </button>
      </form>
    </section>
  );
}

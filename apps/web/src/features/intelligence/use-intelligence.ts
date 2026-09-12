"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Proposal, Review, Snapshot } from "@/contracts/schemas";

const POLL_INTERVAL_MS = 5000;

type Failure = { error: { code: string; message: string; retryable: boolean } };
type IntelligenceState = {
  snapshot: Snapshot | null;
  reviews: Review[];
  proposals: Proposal[];
};

export type ReviewStage = "review" | "proposal";
export type IntelligenceControls = ReturnType<typeof useIntelligence>;

const EMPTY: IntelligenceState = { snapshot: null, reviews: [], proposals: [] };

export function useIntelligence(initial: IntelligenceState, onBoardChange: () => Promise<void>) {
  const [state, setState] = useState<IntelligenceState>(initial ?? EMPTY);
  const [stage, setStage] = useState<ReviewStage>("review");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "review" | "sync" | "decide">(null);

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T | null> => {
      const response = await fetch(path, {
        ...init,
        headers: { "content-type": "application/json", ...init?.headers },
      });
      const body = (await response.json().catch(() => null)) as { data: T } | Failure | null;
      if (body === null) {
        setNotice("The server returned an unreadable response.");
        return null;
      }
      if (!response.ok) {
        setNotice("error" in body ? body.error.message : "The request failed.");
        return null;
      }
      return (body as { data: T }).data;
    },
    [],
  );

  const refresh = useCallback(async () => {
    const next = await request<IntelligenceState>("/api/intelligence");
    if (next !== null) setState(next);
  }, [request]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && busy === null) void refresh();
    };
    const timer = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [busy, refresh]);

  const run = useCallback(
    async (kind: "review" | "sync" | "decide", operation: () => Promise<void>) => {
      setBusy(kind);
      setNotice(null);
      try {
        await operation();
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const sync = useCallback(
    () =>
      run("sync", async () => {
        const done = await request<{ snapshot: Snapshot }>("/api/github/sync", { method: "POST" });
        if (done === null) return;
        await Promise.all([refresh(), onBoardChange()]);
      }),
    [onBoardChange, refresh, request, run],
  );

  const review = useCallback(
    () =>
      run("review", async () => {
        const done = await request<{ review: Review }>("/api/review", { method: "POST" });
        if (done === null) return;
        setStage("review");
        await Promise.all([refresh(), onBoardChange()]);
      }),
    [onBoardChange, refresh, request, run],
  );

  const decide = useCallback(
    (proposal: Proposal, verdict: "approve" | "reject") =>
      run("decide", async () => {
        const done = await request<Proposal>(`/api/proposals/${proposal.id}/${verdict}`, {
          method: "POST",
          body: JSON.stringify({ expectedVersion: proposal.version }),
        });
        if (done === null) {
          // A refused decision usually means the record moved on; show what
          // it actually is rather than leaving a stale card on screen.
          await refresh();
          return;
        }
        await Promise.all([refresh(), onBoardChange()]);
      }),
    [onBoardChange, refresh, request, run],
  );

  // Newest first: the panel always shows the current reading, and an older
  // one never reappears because it happened to be later in the array.
  const latestReview = useMemo(
    () =>
      [...state.reviews].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ??
      null,
    [state.reviews],
  );

  const latestProposal = useMemo(
    () =>
      latestReview?.proposalId === null || latestReview === null
        ? null
        : (state.proposals.find((item) => item.id === latestReview.proposalId) ?? null),
    [latestReview, state.proposals],
  );

  return {
    snapshot: state.snapshot,
    review: latestReview,
    proposal: latestProposal,
    stage,
    setStage,
    notice,
    dismissNotice: () => setNotice(null),
    busy,
    sync,
    runReview: review,
    decide,
    refresh,
  };
}

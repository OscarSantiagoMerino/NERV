"use client";

import { useCallback, useState } from "react";
import type { DemoState, Proposal, Review, Snapshot } from "@/contracts/mvp";

type Failure = { error: { code: string; message: string; retryable: boolean } };
type Busy = "sync" | "review" | "decide" | null;
type Stage = "review" | "proposal";

export type IntelligenceControls = ReturnType<typeof useIntelligence>;

export function useIntelligence(
  initial: { snapshot: Snapshot | null; reviews: Review[]; proposals: Proposal[] },
  profileId: () => string,
  onChanged: () => void | Promise<void>,
) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(initial.snapshot);
  const [review, setReview] = useState<Review | null>(initial.reviews.at(-1) ?? null);
  const [proposal, setProposal] = useState<Proposal | null>(initial.proposals.at(-1) ?? null);
  const [busy, setBusy] = useState<Busy>(null);
  const [stage, setStage] = useState<Stage>("review");
  const [notice, setNotice] = useState<string | null>(null);

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T | null> => {
      const response = await fetch(path, {
        ...init,
        headers: {
          "content-type": "application/json",
          "X-Nerv-Demo": "1",
          "X-Nerv-Profile": profileId(),
          ...init?.headers,
        },
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
    [profileId],
  );

  const sync = useCallback(async () => {
    setBusy("sync");
    setNotice(null);
    try {
      const result = await request<Snapshot>("/api/mvp/github/sync", { method: "POST", body: "{}" });
      if (result !== null) setSnapshot(result);
      await onChanged();
    } finally {
      setBusy(null);
    }
  }, [request, onChanged]);

  const runReview = useCallback(async () => {
    setBusy("review");
    setNotice(null);
    try {
      const result = await request<Review>("/api/mvp/review", { method: "POST", body: "{}" });
      if (result !== null) {
        setReview(result);
        setStage("review");
        // /review's response is just the Review (CONTRATOS.md §3) — the
        // Proposal it saved has to be picked up from state separately.
        if (result.proposalId !== null) {
          const state = await request<DemoState>("/api/mvp/state");
          const linked = state?.proposals.find((p) => p.id === result.proposalId) ?? null;
          setProposal(linked);
        } else {
          setProposal(null);
        }
      }
    } finally {
      setBusy(null);
    }
  }, [request]);

  const decide = useCallback(
    async (target: Proposal, action: "approve" | "reject") => {
      setBusy("decide");
      setNotice(null);
      try {
        const result = await request<Proposal>(`/api/mvp/proposals/${target.id}/${action}`, {
          method: "POST",
          body: JSON.stringify({ expectedVersion: target.version }),
        });
        if (result !== null) {
          setProposal(result);
          await onChanged();
        }
      } finally {
        setBusy(null);
      }
    },
    [request, onChanged],
  );

  return {
    snapshot,
    review,
    proposal,
    busy,
    stage,
    setStage,
    notice,
    dismissNotice: () => setNotice(null),
    sync,
    runReview,
    decide,
  };
}

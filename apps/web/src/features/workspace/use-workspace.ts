"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DemoProfile, DemoState, Message, Task, WorkflowState } from "@/contracts/mvp";

const POLL_INTERVAL_MS = 5000;
const PROFILE_STORAGE_KEY = "nerv-demo-profile";

export type WorkspaceView = "overview" | "board" | "team";

type Failure = { error: { code: string; message: string; retryable: boolean } };

export type WorkspaceControls = ReturnType<typeof useWorkspace>;

function currentProfileId(profiles: DemoProfile[]): string {
  if (typeof window === "undefined") return profiles[0]?.id ?? "";
  const stored = window.sessionStorage.getItem(PROFILE_STORAGE_KEY);
  return stored && profiles.some((p) => p.id === stored) ? stored : (profiles[0]?.id ?? "");
}

export function useWorkspace(initial: DemoState) {
  const [profileId, setProfileId] = useState(() => currentProfileId(initial.profiles));
  const [tasks, setTasks] = useState<Task[]>(initial.tasks);
  const [messages, setMessages] = useState<Message[]>(initial.messages);
  const [view, setView] = useState<WorkspaceView>("board");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(0);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const profileIdRef = useRef(profileId);
  profileIdRef.current = profileId;

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T | null> => {
      const response = await fetch(path, {
        ...init,
        headers: {
          "content-type": "application/json",
          "X-Nerv-Demo": "1",
          "X-Nerv-Profile": profileIdRef.current,
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
    [],
  );

  const refresh = useCallback(async () => {
    const state = await request<DemoState>("/api/mvp/state");
    if (state === null) return;
    setTasks(state.tasks);
    setMessages(state.messages);
  }, [request]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(tick, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  const mutate = useCallback(async (operation: () => Promise<void>) => {
    setPending((count) => count + 1);
    setNotice(null);
    try {
      await operation();
    } finally {
      setPending((count) => count - 1);
    }
  }, []);

  const moveTask = useCallback(
    (taskId: string, workflowState: WorkflowState) =>
      mutate(async () => {
        const task = tasksRef.current.find((candidate) => candidate.id === taskId);
        if (task === undefined) return;
        const updated = await request<Task>(`/api/mvp/tasks/${taskId}`, {
          method: "PATCH",
          body: JSON.stringify({ workflowState, expectedVersion: task.version }),
        });
        if (updated === null) {
          await refresh();
          return;
        }
        setTasks((current) => current.map((item) => (item.id === taskId ? updated : item)));
      }),
    [mutate, refresh, request],
  );

  const sendMessage = useCallback(
    (text: string) =>
      mutate(async () => {
        const created = await request<Message>("/api/mvp/messages", {
          method: "POST",
          body: JSON.stringify({ text }),
        });
        if (created === null) return;
        setMessages((current) => [...current, created]);
      }),
    [mutate, request],
  );

  const switchProfile = useCallback((nextProfileId: string) => {
    setProfileId(nextProfileId);
    window.sessionStorage.setItem(PROFILE_STORAGE_KEY, nextProfileId);
  }, []);

  const profileName = useCallback(
    (id: string | null) => initial.profiles.find((p) => p.id === id)?.name ?? "Unassigned",
    [initial.profiles],
  );

  const viewer = useMemo(
    () => initial.profiles.find((p) => p.id === profileId) ?? initial.profiles[0],
    [initial.profiles, profileId],
  );

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );

  return {
    project: initial.project,
    profiles: initial.profiles,
    viewer,
    switchProfile,
    tasks,
    messages,
    view,
    setView,
    selectedTask,
    selectTask: setSelectedTaskId,
    notice,
    dismissNotice: () => setNotice(null),
    saving: pending > 0,
    refresh,
    moveTask,
    sendMessage,
    profileName,
  };
}

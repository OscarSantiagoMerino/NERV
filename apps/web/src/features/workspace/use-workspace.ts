"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Member, Message, Store, Task } from "@/contracts/schemas";

const POLL_INTERVAL_MS = 5000;

export type WorkspaceView = "overview" | "board" | "team";

export type NewTaskInput = {
  title: string;
  description: string;
  acceptanceCriteria: string;
  milestoneId: string | null;
  responsibleId: string | null;
};

type Failure = { error: { code: string; message: string; retryable: boolean } };

export type WorkspaceControls = ReturnType<typeof useWorkspace>;

export function useWorkspace(initial: Store, viewer: Member) {
  const projectId = initial.project.id;
  const [tasks, setTasks] = useState<Task[]>(initial.tasks);
  const [messages, setMessages] = useState<Message[]>(initial.messages);
  const [view, setView] = useState<WorkspaceView>("board");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(0);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

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
    const [nextTasks, nextMessages] = await Promise.all([
      request<Task[]>(`/api/tasks?projectId=${encodeURIComponent(projectId)}`),
      request<Message[]>(`/api/messages?projectId=${encodeURIComponent(projectId)}`),
    ]);
    if (nextTasks !== null) setTasks(nextTasks);
    if (nextMessages !== null) setMessages(nextMessages);
  }, [projectId, request]);

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

  const patchTask = useCallback(
    (taskId: string, patch: Partial<Task>) =>
      mutate(async () => {
        const task = tasksRef.current.find((candidate) => candidate.id === taskId);
        if (task === undefined) return;
        const updated = await request<Task>(`/api/tasks/${taskId}`, {
          method: "PATCH",
          body: JSON.stringify({ ...patch, expectedVersion: task.version }),
        });
        if (updated === null) {
          await refresh();
          return;
        }
        setTasks((current) => current.map((item) => (item.id === taskId ? updated : item)));
      }),
    [mutate, refresh, request],
  );

  const moveTask = useCallback(
    (taskId: string, workflowState: Task["workflowState"]) =>
      patchTask(taskId, { workflowState }),
    [patchTask],
  );

  const assignTask = useCallback(
    (taskId: string, responsibleId: string | null) => patchTask(taskId, { responsibleId }),
    [patchTask],
  );

  const addTask = useCallback(
    (input: NewTaskInput) =>
      mutate(async () => {
        const created = await request<Task>("/api/tasks", {
          method: "POST",
          body: JSON.stringify({ ...input, projectId }),
        });
        if (created === null) return;
        setTasks((current) => [...current, created]);
        setSelectedTaskId(created.id);
      }),
    [mutate, projectId, request],
  );

  const sendMessage = useCallback(
    (text: string) =>
      mutate(async () => {
        const created = await request<Message>("/api/messages", {
          method: "POST",
          body: JSON.stringify({ text, projectId }),
        });
        if (created === null) return;
        setMessages((current) => [...current, created]);
      }),
    [mutate, projectId, request],
  );

  const switchViewer = useCallback(
    (memberId: string) =>
      mutate(async () => {
        const changed = await request<{ member: Member }>("/api/session", {
          method: "POST",
          body: JSON.stringify({ memberId }),
        });
        if (changed === null) return;
        window.location.reload();
      }),
    [mutate, request],
  );

  const memberName = useCallback(
    (memberId: string | null) =>
      initial.members.find((member) => member.id === memberId)?.displayName ?? "Unassigned",
    [initial.members],
  );

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );

  return {
    project: initial.project,
    members: initial.members,
    viewer,
    switchViewer,
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
    assignTask,
    addTask,
    sendMessage,
    memberName,
  };
}

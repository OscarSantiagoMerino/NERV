"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACTOR_HEADER,
  type Message,
  type Task,
  type WorkflowState,
  type WorkspaceSnapshot,
} from "./types";

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

export function useWorkspace(initial: WorkspaceSnapshot) {
  const [actorId, setActorId] = useState(initial.members[0].id);
  const [tasks, setTasks] = useState<Task[]>(initial.tasks);
  const [messages, setMessages] = useState<Message[]>(initial.messages);
  const [view, setView] = useState<WorkspaceView>("board");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(0);

  const actorRef = useRef(actorId);
  actorRef.current = actorId;

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T | null> => {
      const response = await fetch(path, {
        ...init,
        headers: {
          "content-type": "application/json",
          [ACTOR_HEADER]: actorRef.current,
          ...init?.headers,
        },
      });
      const body = (await response.json()) as { data: T } | Failure;
      if (!response.ok) {
        setNotice("error" in body ? body.error.message : "The request failed.");
        return null;
      }
      return (body as { data: T }).data;
    },
    [],
  );

  const refresh = useCallback(async () => {
    const [taskPage, messagePage] = await Promise.all([
      request<{ tasks: Task[] }>("/api/tasks"),
      request<{ messages: Message[] }>("/api/messages"),
    ]);
    if (taskPage !== null) setTasks(taskPage.tasks);
    if (messagePage !== null) setMessages(messagePage.messages);
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

  const mutate = useCallback(
    async (operation: () => Promise<void>) => {
      setPending((count) => count + 1);
      setNotice(null);
      try {
        await operation();
      } finally {
        setPending((count) => count - 1);
      }
    },
    [],
  );

  const moveTask = useCallback(
    (taskId: string, workflowState: WorkflowState) =>
      mutate(async () => {
        const task = tasks.find((candidate) => candidate.id === taskId);
        if (task === undefined) return;
        const result = await request<{ task: Task }>(`/api/tasks/${taskId}`, {
          method: "PATCH",
          body: JSON.stringify({ workflowState, expectedVersion: task.version }),
        });
        if (result === null) {
          await refresh();
          return;
        }
        setTasks((current) =>
          current.map((item) => (item.id === taskId ? result.task : item)),
        );
      }),
    [mutate, refresh, request, tasks],
  );

  const assignTask = useCallback(
    (taskId: string, responsibleId: string | null) =>
      mutate(async () => {
        const task = tasks.find((candidate) => candidate.id === taskId);
        if (task === undefined) return;
        const result = await request<{ task: Task }>(`/api/tasks/${taskId}`, {
          method: "PATCH",
          body: JSON.stringify({ responsibleId, expectedVersion: task.version }),
        });
        if (result === null) {
          await refresh();
          return;
        }
        setTasks((current) =>
          current.map((item) => (item.id === taskId ? result.task : item)),
        );
      }),
    [mutate, refresh, request, tasks],
  );

  const addTask = useCallback(
    (input: NewTaskInput) =>
      mutate(async () => {
        const result = await request<{ task: Task }>("/api/tasks", {
          method: "POST",
          body: JSON.stringify(input),
        });
        if (result === null) return;
        setTasks((current) => [...current, result.task]);
        setSelectedTaskId(result.task.id);
      }),
    [mutate, request],
  );

  const sendMessage = useCallback(
    (text: string) =>
      mutate(async () => {
        const result = await request<{ message: Message }>("/api/messages", {
          method: "POST",
          body: JSON.stringify({ text }),
        });
        if (result === null) return;
        setMessages((current) => [...current, result.message]);
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

  const actor = useMemo(
    () => initial.members.find((member) => member.id === actorId) ?? initial.members[0],
    [actorId, initial.members],
  );

  return {
    project: initial.project,
    members: initial.members,
    actor,
    setActorId,
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

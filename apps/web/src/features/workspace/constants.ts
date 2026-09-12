import type { Task } from "@/contracts/schemas";

export const WORKFLOW_STATES: Task["workflowState"][] = ["todo", "doing", "done"];
export const MESSAGE_MAX_LENGTH = 2000;

/**
 * The web surface's runtime endpoint.
 *
 * A Hono app built at module scope; Next.js route handlers are fetch-based, so
 * `app.fetch` is the handler. The catch-all segment lets Hono route the
 * runtime's sub-paths itself.
 *
 * TWO THINGS TO NOT DO HERE:
 *
 * 1. Do NOT declare `channels` on this runtime, and never call
 *    `app.channels.ready()`. Next.js isolates freeze and recycle per request,
 *    so a cold start would mint a competing listener for the same Channel —
 *    and managed delivery is claim-based, so the loser silently gets nothing.
 *    The Channels listener is `apps/channel`, a long-running process.
 *
 * 2. Do NOT reuse one agent instance across requests. The factory form hands
 *    out a fresh agent per resolution.
 */
import { randomUUID } from "node:crypto";
import {
  CopilotRuntime,
  createCopilotHonoHandler,
} from "@copilotkit/runtime/v2";
import { makeAgent, NERV_PROJECT_ASSISTANT_PROMPT } from "agent-core";
import { NERV_AGENTS } from "@/features/intelligence/agent-catalog";
import { DemoError, getDemoContext } from "@/server/platform/mvp";

// The assistant gets no external write tools. GitHub writes stay behind the
// versioned proposal approval route and are never reachable from this runtime.
const projectAssistant = NERV_AGENTS.projectAssistant;
const runtime = new CopilotRuntime({
  agents: () => ({
    [projectAssistant.runtimeAgentId]: makeAgent(randomUUID(), {
      workplace: false,
      prompt: NERV_PROJECT_ASSISTANT_PROMPT,
    }),
  }),
});

const app = createCopilotHonoHandler({
  runtime,
  basePath: "/api/copilotkit",
});

async function handle(request: Request): Promise<Response> {
  try {
    getDemoContext(request, {
      requireOrigin: request.method !== "GET" && request.method !== "OPTIONS",
    });
  } catch (error) {
    if (error instanceof DemoError) {
      return Response.json(
        { error: { code: error.code, message: error.message, retryable: error.retryable } },
        { status: error.status },
      );
    }
    throw error;
  }
  return app.fetch(request);
}

export const GET = handle;
export const POST = handle;
export const OPTIONS = handle;

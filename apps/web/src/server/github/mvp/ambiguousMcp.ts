/**
 * Ambiguous MCP connection + tool discovery — docs/mvp/CONTRATOS.md §10/§11.
 * Owner: P3 (same as client.ts, which is the only caller of this module).
 *
 * Ambiguous's tool names/arguments are discovered live from the connected
 * workspace, not fixed (using-sponsor-tools.md) — so this file never
 * hardcodes a tool name. It lists the workspace's tools and picks a
 * read/create candidate by name+description heuristics, and only calls a
 * tool when it can map the operation's known fields (title/body) onto that
 * tool's declared inputSchema. Untested against a live workspace — there is
 * no AMBIGUOUS_API_KEY in this environment. Verify against a real workspace
 * before treating this as done; adjust the heuristics to match what the
 * real tool names/schemas turn out to be.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const AMBIGUOUS_MCP_URL = "https://app.ambiguous.ai/mcp";

export interface AmbiguousTool {
  name: string;
  description?: string;
  inputSchema: {
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export function ambiguousApiKey(): string | null {
  return process.env.AMBIGUOUS_API_KEY?.trim() || null;
}

export async function withAmbiguousClient<T>(
  apiKey: string,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL(AMBIGUOUS_MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
  });
  const client = new Client({ name: "nerv-mvp", version: "0.1.0" });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

/**
 * Scores by NAME SEGMENTS (verb + domain, underscore-split), not description
 * substring matching. Tuned 2026-09-12 against this real workspace's live
 * MCP listing (856 tools) — a description-substring version of this picker
 * was tried first and failed badly (picked search_workspace / create_folder,
 * both generic Drive/search tools, nothing to do with tasks). Re-verify
 * against ambiguous-tools.json (or a fresh listTools() dump) if Ambiguous
 * ever renames its task tools.
 */
const CORE_DOMAIN_WORDS = ["task", "tasks"];
const SECONDARY_DOMAIN_WORDS = ["subtask", "subtasks"];
const READ_VERBS = ["list", "search", "get", "find", "query"];
const WRITE_VERBS = ["create", "add", "new"];
// Sub-resource modifiers: a tool whose name contains one of these is acting
// on a task's label/view/comment/etc., not on the task itself — exclude it
// even though it's in the task domain and matches a verb.
const SUBRESOURCE_WORDS = [
  "template", "templates", "label", "labels", "view", "views", "favorite", "favorites",
  "subscribed", "subscribe", "subscription", "subscriptions", "subscriber",
  "relation", "relations", "sla", "inbox", "export", "batch", "bulk", "comment", "comments",
  "attachment", "attachments", "activity", "by", "key", "pr", "links", "reaction", "reactions",
  "reorder", "layout", "timer", "count", "dashboard", "thresholds", "status",
];

function nameSegments(tool: AmbiguousTool): string[] {
  return tool.name.toLowerCase().split("_").filter(Boolean);
}

function domainRank(segments: string[]): number {
  if (segments.some((word) => CORE_DOMAIN_WORDS.includes(word))) return 2;
  if (segments.some((word) => SECONDARY_DOMAIN_WORDS.includes(word))) return 1;
  return 0;
}

function score(tool: AmbiguousTool, verbs: string[]): number {
  const segments = nameSegments(tool);
  const dRank = domainRank(segments);
  if (dRank === 0) return -1;
  if (segments.some((word) => SUBRESOURCE_WORDS.includes(word))) return -1;
  const verbHits = segments.filter((word) => verbs.includes(word)).length;
  if (verbHits === 0) return -1;
  const lengthBonus = Math.max(0, 4 - segments.length); // shorter name = more "primary"
  return dRank * 10 + verbHits * 5 + lengthBonus;
}

/** Only considers no-argument tools — safe to call with no data to supply. */
export function pickReadTool(tools: AmbiguousTool[]): AmbiguousTool | null {
  return tools
    .filter((tool) => (tool.inputSchema.required ?? []).length === 0)
    .map((tool) => ({ tool, s: score(tool, READ_VERBS) }))
    .filter((entry) => entry.s > 0)
    .sort((a, b) => b.s - a.s)[0]?.tool ?? null;
}

export function pickCreateTool(tools: AmbiguousTool[]): AmbiguousTool | null {
  return tools
    .map((tool) => ({ tool, s: score(tool, WRITE_VERBS) }))
    .filter((entry) => entry.s > 0)
    .sort((a, b) => b.s - a.s)[0]?.tool ?? null;
}

/** Maps title/body onto whatever field names this tool's schema actually declares. */
export function buildCreateArgs(
  tool: AmbiguousTool,
  title: string,
  body: string,
): Record<string, string> {
  const properties = tool.inputSchema.properties ?? {};
  const keys = Object.keys(properties);
  const titleKey = keys.find((key) => /title|name|summary/i.test(key));
  const bodyKey = keys.find((key) => /body|description|details|content/i.test(key));
  const args: Record<string, string> = {};
  if (titleKey) args[titleKey] = title;
  if (bodyKey) args[bodyKey] = body;
  return args;
}

interface ToolContentItem {
  type: string;
  text?: string;
}

interface ToolCallResult {
  content?: ToolContentItem[];
  structuredContent?: unknown;
  isError?: boolean;
  [key: string]: unknown;
}

export function extractText(response: ToolCallResult): string {
  return (response.content ?? [])
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text as string)
    .join("\n");
}

function firstStringField(obj: Record<string, unknown>, pattern: RegExp): string | null {
  for (const [key, value] of Object.entries(obj)) {
    if (pattern.test(key) && typeof value === "string" && value) return value;
  }
  return null;
}

/**
 * Single-object write responses are wrapped inconsistently across tools —
 * verified live: create_task nests as {"task": {...}}, but other write tools
 * in this workspace could plausibly nest as {"record"/"item"/"data": {...}}
 * or not nest at all. Unwraps one level if the object itself has no `id`.
 */
function unwrapSingleRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.id === "string" || typeof obj.recordId === "string" || typeof obj.taskId === "string") return obj;
  for (const key of ["task", "record", "item", "data", "result"]) {
    const nested = obj[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) return nested as Record<string, unknown>;
  }
  return obj;
}

/**
 * `url` is nullable, verified against the live workspace 2026-09-12: Ambiguous's
 * task tools (list_tasks/get_task/create_task) return `id` (UUID) and
 * `task_key` (e.g. "TASK-001") but NO url/link/permalink field anywhere, and
 * no URL pattern is documented in Ambiguous's public sandbox docs either. Per
 * CONTRATOS.md §10/§11's own rule, a url is never invented — only returned if
 * the tool actually provides one (e.g. a differently-configured workspace, or
 * a future Ambiguous API version, might).
 */
export function extractRecordRef(response: ToolCallResult): { recordId: string; taskKey: string | null; url: string | null } | null {
  const unwrapped = unwrapSingleRecord(response.structuredContent);
  if (unwrapped) {
    const id = firstStringField(unwrapped, /^(id|recordid|taskid)$/i);
    if (id) {
      const url = firstStringField(unwrapped, /^(url|link|href)$/i);
      const taskKey = firstStringField(unwrapped, /^(task_key|taskkey|key)$/i);
      return { recordId: id, taskKey: taskKey ?? null, url: url ?? null };
    }
  }
  const text = extractText(response);
  const urlMatch = text.match(/https?:\/\/\S+/);
  const idMatch = text.match(/\bid[\s:_-]*([\w-]{4,})/i);
  if (idMatch) return { recordId: idMatch[1], taskKey: null, url: urlMatch?.[0] ?? null };
  return null;
}

export interface AmbiguousRecordSummary {
  recordId: string;
  taskKey: string | null;
  title: string;
  status: string;
  url: string | null;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  if (value && typeof value === "object") {
    for (const key of ["data", "items", "records", "tasks", "results"]) {
      const nested = (value as Record<string, unknown>)[key];
      if (Array.isArray(nested)) return asRecordArray(nested);
    }
  }
  return [];
}

export function extractRecordList(response: ToolCallResult): AmbiguousRecordSummary[] {
  const raw = asRecordArray(response.structuredContent);
  return raw
    .map((item) => ({
      recordId: firstStringField(item, /^(id|recordid|taskid)$/i) ?? "",
      taskKey: firstStringField(item, /^(task_key|taskkey|key)$/i),
      title: firstStringField(item, /^(title|name)$/i) ?? "",
      status: firstStringField(item, /^(status|state)$/i) ?? "unknown",
      url: firstStringField(item, /^(url|link|href)$/i),
    }))
    .filter((record) => record.recordId);
}

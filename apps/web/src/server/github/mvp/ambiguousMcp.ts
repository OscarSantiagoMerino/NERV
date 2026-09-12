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

const READ_HINTS = ["list", "search", "get", "read", "find", "query"];
const WRITE_HINTS = ["create", "add", "new"];
const EXCLUDE_FROM_READ = ["create", "update", "delete", "remove", "archive"];
const EXCLUDE_FROM_WRITE = ["delete", "remove", "archive", "update", "list", "search"];

function score(tool: AmbiguousTool, hints: string[], exclude: string[]): number {
  const haystack = `${tool.name} ${tool.description ?? ""}`.toLowerCase();
  if (exclude.some((word) => haystack.includes(word))) return -1;
  const taskish = ["task", "record", "item"].some((word) => haystack.includes(word));
  const hintHits = hints.filter((hint) => haystack.includes(hint)).length;
  if (!taskish && hintHits === 0) return -1;
  return (taskish ? 1 : 0) + hintHits;
}

/** Only considers no-argument tools — safe to call with no data to supply. */
export function pickReadTool(tools: AmbiguousTool[]): AmbiguousTool | null {
  return tools
    .filter((tool) => (tool.inputSchema.required ?? []).length === 0)
    .map((tool) => ({ tool, s: score(tool, READ_HINTS, EXCLUDE_FROM_READ) }))
    .filter((entry) => entry.s > 0)
    .sort((a, b) => b.s - a.s)[0]?.tool ?? null;
}

export function pickCreateTool(tools: AmbiguousTool[]): AmbiguousTool | null {
  return tools
    .map((tool) => ({ tool, s: score(tool, WRITE_HINTS, EXCLUDE_FROM_WRITE) }))
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

export function extractRecordRef(response: ToolCallResult): { recordId: string; url: string } | null {
  const structured = response.structuredContent;
  if (structured && typeof structured === "object") {
    const id = firstStringField(structured as Record<string, unknown>, /^(id|recordid|taskid)$/i);
    const url = firstStringField(structured as Record<string, unknown>, /^(url|link|href)$/i);
    if (id && url) return { recordId: id, url };
  }
  const text = extractText(response);
  const urlMatch = text.match(/https?:\/\/\S+/);
  const idMatch = text.match(/\bid[\s:_-]*([\w-]{4,})/i);
  if (urlMatch && idMatch) return { recordId: idMatch[1], url: urlMatch[0] };
  return null;
}

export interface AmbiguousRecordSummary {
  recordId: string;
  title: string;
  status: string;
  url: string;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  if (value && typeof value === "object") {
    for (const key of ["items", "records", "tasks", "results"]) {
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
      title: firstStringField(item, /^(title|name)$/i) ?? "",
      status: firstStringField(item, /^(status|state)$/i) ?? "unknown",
      url: firstStringField(item, /^(url|link|href)$/i) ?? "",
    }))
    .filter((record) => record.recordId && record.url);
}

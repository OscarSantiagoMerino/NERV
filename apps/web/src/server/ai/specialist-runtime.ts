import { OpenAIProvider, Runner } from "@openai/agents";

export type SpecialistRuntime = { model: string; runner: Runner };

/**
 * Resolve the server-side specialist runtime without requiring a paid API.
 * Ollama exposes an OpenAI-compatible local endpoint; the placeholder key is
 * required by the client shape but is ignored by Ollama.
 */
export function configuredSpecialistRuntime(): SpecialistRuntime | null {
  const selectedProvider = (process.env.MODEL_PROVIDER || "ollama").trim().toLowerCase();

  if (selectedProvider === "ollama") {
    const model = (process.env.MODEL || "qwen3:4b").trim().replace(/^ollama[/:]/i, "");
    if (!model) return null;

    const configuredBaseURL = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1")
      .trim()
      .replace(/\/+$/, "");
    const baseURL = configuredBaseURL.endsWith("/v1")
      ? configuredBaseURL
      : `${configuredBaseURL}/v1`;

    return {
      model,
      runner: new Runner({
        modelProvider: new OpenAIProvider({
          apiKey: "ollama",
          baseURL,
          useResponses: false,
        }),
        tracingDisabled: true,
      }),
    };
  }

  if (selectedProvider !== "openai") return null;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey === "stub-replace-me") return null;

  const model = (process.env.MODEL || "gpt-4o-mini").trim().replace(/^openai[/:]/i, "");
  if (!model || /^(openrouter|anthropic|google|ollama)[/:]/i.test(model)) return null;

  return {
    model,
    runner: new Runner({
      modelProvider: new OpenAIProvider({ apiKey }),
      tracingDisabled: true,
    }),
  };
}

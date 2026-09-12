export const DEFAULT_MODEL = "qwen3:4b";

/**
 * Alternates, documented so you don't have to go digging mid-build.
 *
 * The defaults run locally through Ollama and do not consume paid API credits.
 * Larger models improve answers but require more RAM and take longer to start.
 */
export const MODEL_NOTES = {
  "qwen3:4b": "default · local through Ollama · no API charge",
  "qwen3:8b": "better quality · local through Ollama · needs more RAM",
} as const;

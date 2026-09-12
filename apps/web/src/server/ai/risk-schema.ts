import { z } from "zod";

/**
 * What the specialist is allowed to return. Everything the model produces
 * passes through this before it is persisted or shown: a proposal body is
 * published verbatim on approval, so an unvalidated shape here would be a
 * shape that reaches GitHub.
 */
export const RiskFindingSchema = z.object({
  goalImpact: z
    .string()
    .min(1)
    .max(600)
    .describe("How this threatens the project's stated success criterion."),
  summary: z.string().min(1).max(1200).describe("The finding itself, in prose."),
  evidenceIssueNumbers: z
    .array(z.number().int().positive())
    .max(10)
    .describe("Issue numbers that appear in the snapshot. Never invent one."),
  observations: z
    .array(z.string().max(300))
    .max(6)
    .describe("Facts read directly from the charter or the snapshot."),
  inferences: z
    .array(z.string().max(300))
    .max(6)
    .describe("Conclusions drawn from those facts, kept separate from them."),
  limitations: z
    .array(z.string().max(300))
    .max(6)
    .describe("What this reading could not establish."),
  proposal: z
    .object({
      title: z.string().min(1).max(120),
      body: z.string().min(1).max(4000),
      rationale: z.string().min(1).max(600),
    })
    .nullable()
    .describe("One mitigation, or null when the evidence does not support one."),
});
export type RiskFinding = z.infer<typeof RiskFindingSchema>;

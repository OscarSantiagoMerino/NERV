import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { GitHubRefSchema, type GitHubRef } from "@/contracts/schemas";
import { issueUrl } from "./config";

// Six issues standing in for the repository when no GITHUB_TOKEN is set.
// Titles match the seeded tasks so a sync binds them the way a live read
// would; numbers, labels and states are the only things they teach the
// board. Never presented as live: Snapshot.mode carries "fixture" through
// to every surface that shows this data.

type FixtureSeed = {
  number: number;
  title: string;
  state: "open" | "closed";
  labels: string[];
  body: string;
  updatedAt: string;
};

const SEED: FixtureSeed[] = [
  {
    number: 12,
    title: "Instrumentar eventos de analítica en el formulario",
    state: "closed",
    labels: [],
    body: "Eventos de analítica en cada paso del formulario de registro.",
    updatedAt: "2026-09-11T15:02:00.000Z",
  },
  {
    number: 13,
    title: "Desplegar el flujo a un entorno de prueba",
    state: "open",
    labels: [],
    body: "URL de staging accesible para el equipo y para los usuarios reclutados.",
    updatedAt: "2026-09-12T11:20:00.000Z",
  },
  {
    number: 14,
    title: "Reclutar 5 usuarios de prueba",
    state: "open",
    labels: ["blocked"],
    body:
      "Los correos de confirmación no llegan a dominios externos en staging, " +
      "así que ningún usuario reclutado puede terminar el registro sin ayuda.",
    updatedAt: "2026-09-12T13:58:00.000Z",
  },
  {
    number: 15,
    title: "Revisar copys y mensajes de error del formulario",
    state: "open",
    labels: [],
    body: "Revisión de textos por el lead antes de las sesiones.",
    updatedAt: "2026-09-12T11:20:00.000Z",
  },
  {
    number: 16,
    title: "Ejecutar sesiones de prueba y registrar resultados",
    state: "open",
    labels: [],
    body: "Cinco sesiones moderadas, con resultado y evidencia por sesión.",
    updatedAt: "2026-09-12T11:20:00.000Z",
  },
  {
    number: 17,
    title: "Redactar reporte de validación",
    state: "open",
    labels: [],
    body: "Reporte con los cinco resultados, compartido con el equipo.",
    updatedAt: "2026-09-12T09:40:00.000Z",
  },
];

/**
 * Issues created through the fixture, in a file of their own.
 *
 * Not module state: route handlers are compiled separately in dev, so an
 * in-memory array is not shared between the route that creates an issue
 * and the route that later searches for its marker — reconciliation would
 * never find anything. This file stands in for the repository, which is
 * why it lives beside the store rather than inside it.
 */
const FIXTURE_PATH = join(process.cwd(), ".data", "nerv-fixture-repo.json");

const FileSchema = z.object({ issues: z.array(GitHubRefSchema).default([]) });

let writeQueue: Promise<unknown> = Promise.resolve();

async function readCreated(): Promise<GitHubRef[]> {
  try {
    const raw = await readFile(FIXTURE_PATH, "utf-8");
    return FileSchema.parse(JSON.parse(raw)).issues;
  } catch {
    return [];
  }
}

function seedFor(repo: string): GitHubRef[] {
  return SEED.map((seed) => ({
    repo,
    number: seed.number,
    url: issueUrl(repo, seed.number),
    title: seed.title,
    state: seed.state,
    labels: seed.labels,
    body: seed.body,
    updatedAt: seed.updatedAt,
  }));
}

export async function fixtureIssues(repo: string): Promise<GitHubRef[]> {
  const created = await readCreated();
  return [...seedFor(repo), ...created.filter((issue) => issue.repo === repo)];
}

export async function fixtureCreateIssue(
  repo: string,
  input: { title: string; body: string },
): Promise<GitHubRef> {
  const run = writeQueue.then(async () => {
    const created = await readCreated();
    const highest = [...seedFor(repo), ...created].reduce(
      (max, issue) => (issue.number > max ? issue.number : max),
      0,
    );
    const issue: GitHubRef = {
      repo,
      number: highest + 1,
      url: issueUrl(repo, highest + 1),
      title: input.title,
      state: "open",
      labels: [],
      body: input.body,
      updatedAt: new Date().toISOString(),
    };
    await mkdir(dirname(FIXTURE_PATH), { recursive: true });
    await writeFile(
      FIXTURE_PATH,
      JSON.stringify({ issues: [...created, issue] }, null, 2),
      "utf-8",
    );
    return issue;
  });
  writeQueue = run.catch(() => undefined);
  return run;
}

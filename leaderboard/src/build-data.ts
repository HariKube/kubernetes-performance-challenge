import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadRun, REPOSITORY } from "./run.js";
import type { LeaderboardData, LeaderboardEntry, Run } from "./types.js";

/** Lists results/<participant>/*_sum.json (one level deep, dot folders skipped). */
export function findSummaryFiles(resultsDir: string): string[] {
  if (!existsSync(resultsDir)) return [];
  const files: string[] = [];
  for (const dir of readdirSync(resultsDir, { withFileTypes: true })) {
    if (!dir.isDirectory() || dir.name.startsWith(".")) continue;
    for (const f of readdirSync(join(resultsDir, dir.name)).sort()) {
      if (f.endsWith("_sum.json")) files.push(join(resultsDir, dir.name, f));
    }
  }
  return files.sort();
}

/** Better run first: higher score, then earlier submission, then participant name. */
export function compareRuns(a: Pick<Run, "score" | "timestamp" | "participant">, b: Pick<Run, "score" | "timestamp" | "participant">): number {
  return b.score - a.score || a.timestamp - b.timestamp || a.participant.localeCompare(b.participant);
}

/** One entry per participant using their best run; ties go to the earlier submission. */
export function rankRuns(runs: Run[], baselineParticipant: string | null = null): LeaderboardEntry[] {
  const byParticipant = new Map<string, Run[]>();
  for (const run of runs) {
    const list = byParticipant.get(run.participant) ?? [];
    list.push(run);
    byParticipant.set(run.participant, list);
  }
  const bests = [...byParticipant.values()].map((list) => {
    const sorted = [...list].sort(compareRuns);
    return { best: sorted[0]!, runIds: sorted.map((r) => r.id) };
  });
  bests.sort((a, b) => compareRuns(a.best, b.best));
  return bests.map(({ best, runIds }, i) => ({
    rank: i + 1,
    participant: best.participant,
    github: best.github,
    score: best.score,
    bestRunId: best.id,
    runIds,
    isBaseline: best.participant === baselineParticipant,
  }));
}

export interface BuildOptions {
  resultsDir: string;
  /** Participant whose best run is the "score to beat" (from leaderboard/config.json). */
  baselineParticipant?: string | null;
  now?: Date;
}

export interface BuildResult {
  data: LeaderboardData;
  /** Files that failed validation and were left out. */
  errors: string[];
}

export function buildLeaderboard({ resultsDir, baselineParticipant = null, now = new Date() }: BuildOptions): BuildResult {
  const runs: Run[] = [];
  const errors: string[] = [];
  const warnings = new Set<string>();

  for (const file of findSummaryFiles(resultsDir)) {
    const result = loadRun(file);
    result.warnings.forEach((w) => warnings.add(w));
    errors.push(...result.errors);
    if (result.run) runs.push({ ...result.run, isBaseline: result.run.participant === baselineParticipant });
  }

  // Ids are "<slug>-<ts>-<vus>"; two folders can slug to the same value.
  const seen = new Map<string, number>();
  for (const run of runs) {
    const n = seen.get(run.id) ?? 0;
    seen.set(run.id, n + 1);
    if (n > 0) run.id = `${run.id}-${n + 1}`;
  }

  const entries = rankRuns(runs, baselineParticipant);
  const runsById = new Map(runs.map((r) => [r.id, r]));
  const baselineEntry = entries.find((e) => e.isBaseline);
  const missingSpecs = entries
    .filter((e) => !runsById.get(e.bestRunId)?.specs)
    .map((e) => e.participant)
    .sort();

  return {
    data: {
      schemaVersion: 1,
      generatedAt: now.toISOString(),
      repository: REPOSITORY,
      baseline: baselineEntry
        ? { participant: baselineEntry.participant, score: baselineEntry.score, runId: baselineEntry.bestRunId }
        : null,
      entries,
      runs: [...runs].sort(compareRuns),
      missingSpecs,
      warnings: [...warnings],
    },
    errors,
  };
}

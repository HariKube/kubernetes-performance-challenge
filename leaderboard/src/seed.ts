import { readFileSync } from "node:fs";
import { z } from "zod";
import { makeRunId } from "./run.js";
import type { Run } from "./types.js";

/**
 * leaderboard/data/baseline.json: the baseline taken from the README while the
 * real results/mhmxs/*_sum.json is not in the repository. Its score is the
 * official one (1059); it is not recomputed, because the README only has
 * latencies rounded to two decimals (they would give 1058).
 */
const nonNegative = z.number().nonnegative();

export const seedSchema = z.object({
  participant: z.string().min(1),
  github: z.string().min(1),
  source: z.string(),
  official_score: z.number().int().nonnegative(),
  timestamp: z.number().int().positive(),
  vus: z.number().int().positive(),
  specs: z.string(),
  notes: z.string().optional(),
  metrics: z.object({
    checks_total: z.number().int().positive(),
    checks_failed: z.number().int().nonnegative(),
    http_reqs_count: z.number().int().nonnegative(),
    http_reqs_rate: nonNegative,
    http_req_failed_rate: z.number().min(0).max(1),
    http_req_duration: z.object({
      avg: nonNegative,
      min: nonNegative,
      med: nonNegative,
      max: nonNegative,
      p90: nonNegative,
      p95: nonNegative,
    }),
  }),
});

export const SEED_SOURCE_NOTE = "baseline from README, raw data pending";

export function loadSeed(file: string): Run {
  const parsed = seedSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    throw new Error(`Invalid seed file ${file}: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  const s = parsed.data;
  const m = s.metrics;
  return {
    id: makeRunId(s.participant, s.timestamp, s.vus),
    participant: s.participant,
    github: s.github,
    score: s.official_score,
    metrics: {
      checksTotal: m.checks_total,
      checksFailed: m.checks_failed,
      checksSucceededPct: ((m.checks_total - m.checks_failed) / m.checks_total) * 100,
      httpReqsRate: m.http_reqs_rate,
      httpReqsCount: m.http_reqs_count,
      httpReqFailedRate: m.http_req_failed_rate,
      httpReqDuration: { ...m.http_req_duration },
      vusMax: s.vus,
    },
    specs: s.specs,
    notes: s.notes ?? null,
    timestamp: s.timestamp,
    date: new Date(s.timestamp * 1000).toISOString(),
    vus: s.vus,
    source: "seed",
    sourceNote: SEED_SOURCE_NOTE,
    summaryFile: null,
    rawFiles: [],
    isBaseline: true,
  };
}

import { z } from "zod";
import type { RunMetrics } from "./types.js";

/**
 * Schema for the file written by `k6 run --summary-export=...` (the legacy summary
 * export format used by the Makefile). Only the fields we need are validated;
 * everything else in the file is ignored.
 */
const nonNegative = z.number().nonnegative();

export const summarySchema = z.object({
  metrics: z.object({
    checks: z.object({
      passes: z.number().int().nonnegative(),
      fails: z.number().int().nonnegative(),
    }),
    http_req_duration: z.object({
      avg: nonNegative,
      min: nonNegative,
      med: nonNegative,
      max: nonNegative,
      "p(90)": nonNegative,
      "p(95)": nonNegative,
    }),
    http_reqs: z.object({
      count: z.number().int().nonnegative().optional(),
      rate: nonNegative,
    }),
    // k6 Rate metric naming is inverted for http_req_failed: "passes" counts requests
    // where failed == true and "fails" counts successful requests. We only use
    // "value", which is the failure rate (0..1).
    http_req_failed: z.object({
      value: z.number().min(0).max(1),
    }),
    vus_max: z.object({ value: z.number() }).optional(),
  }),
});

export type K6Summary = z.infer<typeof summarySchema>;

export type ParseResult = { ok: true; metrics: RunMetrics } | { ok: false; errors: string[] };

/** Validates a parsed JSON value against the summary schema and extracts metrics. */
export function parseSummary(json: unknown): ParseResult {
  const result = summarySchema.safeParse(json);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((i) => `${i.path.length ? i.path.join(".") : "(root)"}: ${i.message}`),
    };
  }
  return { ok: true, metrics: extractMetrics(result.data) };
}

/** Parses the text of a *_sum.json file. */
export function parseSummaryText(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`invalid JSON: ${(e as Error).message}`] };
  }
  return parseSummary(json);
}

export function extractMetrics(s: K6Summary): RunMetrics {
  const m = s.metrics;
  const checksTotal = m.checks.passes + m.checks.fails;
  const checksFailed = m.checks.fails;
  return {
    checksTotal,
    checksFailed,
    checksSucceededPct: checksTotal > 0 ? ((checksTotal - checksFailed) / checksTotal) * 100 : 0,
    httpReqsRate: m.http_reqs.rate,
    httpReqsCount: m.http_reqs.count ?? null,
    httpReqFailedRate: m.http_req_failed.value,
    httpReqDuration: {
      avg: m.http_req_duration.avg,
      min: m.http_req_duration.min,
      med: m.http_req_duration.med,
      max: m.http_req_duration.max,
      p90: m.http_req_duration["p(90)"],
      p95: m.http_req_duration["p(95)"],
    },
    vusMax: m.vus_max?.value ?? null,
  };
}

export interface SummaryFilename {
  /** "<timestamp>_<vus>" */
  base: string;
  /** Unix seconds (K6_TS in the Makefile). */
  timestamp: number;
  /** Virtual users (K6_VUS in the Makefile). */
  vus: number;
}

const SUMMARY_FILENAME = /^(\d{9,11})_(\d{1,6})_sum\.json$/;

/** Parses "<timestamp>_<vus>_sum.json". Returns null if the name does not match. */
export function parseSummaryFilename(filename: string): SummaryFilename | null {
  const m = SUMMARY_FILENAME.exec(filename);
  if (!m) return null;
  const timestamp = Number(m[1]);
  const vus = Number(m[2]);
  if (vus < 1) return null;
  return { base: `${m[1]}_${m[2]}`, timestamp, vus };
}

/**
 * Returns the raw benchmark data files belonging to a summary: "<base>.json",
 * "<base>.json.zip" or split parts "<base>.json.zip.*". Other files are ignored.
 */
export function findRawFiles(filesInDir: string[], base: string): string[] {
  return filesInDir
    .filter((f) => f === `${base}.json` || f === `${base}.json.zip` || f.startsWith(`${base}.json.zip.`))
    .sort();
}

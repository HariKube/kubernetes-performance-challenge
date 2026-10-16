import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface SummaryOptions {
  passes?: number;
  fails?: number;
  avg?: number;
  min?: number;
  med?: number;
  max?: number;
  p90?: number;
  p95?: number;
  rate?: number;
  failedRate?: number;
}

/** Minimal k6 --summary-export document with the fields the leaderboard uses. */
export function makeSummary(o: SummaryOptions = {}) {
  const passes = o.passes ?? 100000;
  const fails = o.fails ?? 0;
  return {
    metrics: {
      checks: { passes, fails, value: passes / (passes + fails || 1) },
      http_req_duration: {
        avg: o.avg ?? 50,
        min: o.min ?? 1,
        med: o.med ?? 40,
        max: o.max ?? 1000,
        "p(90)": o.p90 ?? 100,
        "p(95)": o.p95 ?? 150,
      },
      http_reqs: { count: passes + fails, rate: o.rate ?? 100 },
      // Inverted k6 naming: passes = failed requests.
      http_req_failed: { passes: fails, fails: passes, value: o.failedRate ?? 0 },
      vus_max: { value: 20, min: 20, max: 20 },
    },
  };
}

/** Creates a temporary repo-like folder containing results/. */
export function makeResultsDir(): string {
  const root = mkdtempSync(join(tmpdir(), "kpc-leaderboard-"));
  const results = join(root, "results");
  mkdirSync(results);
  return results;
}

/**
 * Adds results/<participant>/<ts>_<vus>_sum.json plus a raw file
 * (raw: "json" | "zip" | "parts" | "none").
 */
export function addRun(
  resultsDir: string,
  participant: string,
  timestamp: number,
  vus: number,
  summary: unknown = makeSummary(),
  raw: "json" | "zip" | "parts" | "none" = "json",
): string {
  const dir = join(resultsDir, participant);
  mkdirSync(dir, { recursive: true });
  const base = `${timestamp}_${vus}`;
  const sumPath = join(dir, `${base}_sum.json`);
  writeFileSync(sumPath, typeof summary === "string" ? summary : JSON.stringify(summary));
  if (raw === "json") writeFileSync(join(dir, `${base}.json`), "{}");
  if (raw === "zip") writeFileSync(join(dir, `${base}.json.zip`), "");
  if (raw === "parts") {
    writeFileSync(join(dir, `${base}.json.zip.aa`), "");
    writeFileSync(join(dir, `${base}.json.zip.ab`), "");
  }
  return sumPath;
}

export function addMeta(resultsDir: string, participant: string, meta: unknown) {
  const dir = join(resultsDir, participant);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "meta.json"), typeof meta === "string" ? meta : JSON.stringify(meta));
}

export const SEED_FILE = join(import.meta.dirname, "..", "data", "baseline.json");
export const FIXTURE_PR2 = join(import.meta.dirname, "fixtures", "sample-pr2_sum.json");

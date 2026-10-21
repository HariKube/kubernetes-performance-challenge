import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config.js";

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

const FIXTURES = join(import.meta.dirname, "fixtures");
export const FIXTURE_PR2 = join(FIXTURES, "sample-pr2_sum.json");
export const FIXTURE_CONFIG = join(FIXTURES, "config.json");
export const FIXTURE_META = join(FIXTURES, "meta.json");
/** The repository's own leaderboard/config.json. */
export const REPO_CONFIG = join(import.meta.dirname, "..", "config.json");
export const REPO_RESULTS = join(import.meta.dirname, "..", "..", "results");

export const readJson = (file: string) => JSON.parse(readFileSync(file, "utf8"));

/**
 * results/ with the fixture config's baseline participant: the PR #2 format sample
 * as its run and the fixture meta.json. Returns the dir and that participant.
 */
export function makeFixtureResults(): { results: string; baseline: string } {
  const results = makeResultsDir();
  const { baselineParticipant } = loadConfig(FIXTURE_CONFIG);
  addRun(results, baselineParticipant, 1770000000, 20, readFileSync(FIXTURE_PR2, "utf8"));
  addMeta(results, baselineParticipant, readFileSync(FIXTURE_META, "utf8"));
  return { results, baseline: baselineParticipant };
}

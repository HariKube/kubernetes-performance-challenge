import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { loadMeta, resolveGithub } from "./meta.js";
import { findRawFiles, parseSummaryFilename, parseSummaryText } from "./parse.js";
import { computeScore } from "./score.js";
import type { FileLink, Run } from "./types.js";

export const REPOSITORY = "HariKube/kubernetes-performance-challenge";
export const REPO_BLOB_BASE = `https://github.com/${REPOSITORY}/blob/main`;

export function repoFileLink(repoPath: string): FileLink {
  return { path: repoPath, url: `${REPO_BLOB_BASE}/${repoPath.split("/").map(encodeURIComponent).join("/")}` };
}

/** URL-safe run id: "<participant-slug>-<timestamp>-<vus>". */
export function makeRunId(participant: string, timestamp: number, vus: number): string {
  const slug =
    participant
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "participant";
  return `${slug}-${timestamp}-${vus}`;
}

export interface LoadRunResult {
  run: Run | null;
  errors: string[];
  warnings: string[];
}

/**
 * Loads and fully validates one results/<participant>/<timestamp>_<vus>_sum.json:
 * location, filename, schema, score and the presence of the raw data file.
 */
export function loadRun(sumPath: string): LoadRunResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const filename = basename(sumPath);
  const participantDir = dirname(sumPath);
  const participant = basename(participantDir);
  const repoPath = `results/${participant}/${filename}`;

  if (basename(dirname(participantDir)) !== "results") {
    errors.push(`${filename}: must be located at results/<participant>/${filename}`);
  }
  const name = parseSummaryFilename(filename);
  if (!name) {
    errors.push(`${repoPath}: filename must look like <unix-timestamp>_<vus>_sum.json (e.g. 1771941557_20_sum.json)`);
  }

  let text: string | null = null;
  try {
    text = readFileSync(sumPath, "utf8");
  } catch (e) {
    errors.push(`${repoPath}: cannot read file: ${(e as Error).message}`);
  }

  const parsed = text === null ? null : parseSummaryText(text);
  if (parsed && !parsed.ok) errors.push(...parsed.errors.map((err) => `${repoPath}: ${err}`));

  let score: number | null = null;
  if (parsed?.ok) {
    const d = parsed.metrics.httpReqDuration;
    const result = computeScore({
      checksTotal: parsed.metrics.checksTotal,
      checksFailed: parsed.metrics.checksFailed,
      med: d.med,
      p90: d.p90,
      p95: d.p95,
    });
    if (result.valid) score = result.score;
    else errors.push(`${repoPath}: cannot compute score: ${result.reason}`);
  }

  let rawFiles: string[] = [];
  if (name) {
    let filesInDir: string[] = [];
    try {
      filesInDir = readdirSync(participantDir);
    } catch {
      // Reported above as an unreadable file.
    }
    rawFiles = findRawFiles(filesInDir, name.base);
    if (rawFiles.length === 0) {
      errors.push(
        `${repoPath}: missing raw benchmark data. Expected results/${participant}/${name.base}.json ` +
          `(or ${name.base}.json.zip, or split parts ${name.base}.json.zip.*).`,
      );
    }
  }

  const { meta, warnings: metaWarnings } = loadMeta(participantDir, `results/${participant}`);
  warnings.push(...metaWarnings);
  const { github, warning } = resolveGithub(participant, meta);
  if (warning) warnings.push(warning);

  if (errors.length > 0 || !name || !parsed?.ok || score === null) return { run: null, errors, warnings };

  const run: Run = {
    id: makeRunId(participant, name.timestamp, name.vus),
    participant,
    github,
    score,
    metrics: parsed.metrics,
    specs: meta.specs?.trim() || null,
    notes: meta.notes?.trim() || null,
    timestamp: name.timestamp,
    date: new Date(name.timestamp * 1000).toISOString(),
    vus: name.vus,
    summaryFile: repoFileLink(repoPath),
    rawFiles: rawFiles.map((f) => repoFileLink(`results/${participant}/${f}`)),
    // Set by buildLeaderboard from leaderboard/config.json.
    isBaseline: false,
  };
  return { run, errors, warnings };
}

/** Shared types for the leaderboard data (also imported as types by the site). */

/** http_req_duration statistics, in milliseconds. */
export interface DurationStats {
  avg: number;
  min: number;
  med: number;
  max: number;
  p90: number;
  p95: number;
}

export interface RunMetrics {
  /** checks.passes + checks.fails */
  checksTotal: number;
  /** checks.fails */
  checksFailed: number;
  /** Percentage of checks that passed, 0..100. */
  checksSucceededPct: number;
  /** http_reqs.rate, requests per second. */
  httpReqsRate: number;
  /** http_reqs.count, null if not available. */
  httpReqsCount: number | null;
  /** http_req_failed.value, 0..1. */
  httpReqFailedRate: number;
  httpReqDuration: DurationStats;
  /** vus_max.value, null if not available. */
  vusMax: number | null;
}

export interface FileLink {
  /** Repository-relative path, e.g. results/alice/1771941557_20_sum.json */
  path: string;
  /** Link to the file on GitHub. */
  url: string;
}

export interface Run {
  /** URL-safe unique id, used for /runs/<id>/ */
  id: string;
  /** Display name: the results/<folder> name. */
  participant: string;
  /** GitHub username if one could be determined, otherwise null. */
  github: string | null;
  score: number;
  metrics: RunMetrics;
  specs: string | null;
  notes: string | null;
  /** Unix seconds, from the filename. */
  timestamp: number;
  /** ISO 8601 date derived from timestamp. */
  date: string;
  /** Virtual users, from the filename. */
  vus: number;
  summaryFile: FileLink;
  rawFiles: FileLink[];
  /** Run of the baseline participant from leaderboard/config.json. */
  isBaseline: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  participant: string;
  github: string | null;
  score: number;
  bestRunId: string;
  runIds: string[];
  isBaseline: boolean;
}

export interface LeaderboardData {
  schemaVersion: 1;
  generatedAt: string;
  repository: string;
  baseline: { participant: string; score: number; runId: string } | null;
  entries: LeaderboardEntry[];
  runs: Run[];
  /** Participants (by folder name) without specs in meta.json. */
  missingSpecs: string[];
  warnings: string[];
}

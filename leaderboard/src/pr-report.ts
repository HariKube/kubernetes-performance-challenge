import { compareRuns } from "./build-data.js";
import { loadRun } from "./run.js";
import type { LeaderboardData, Run } from "./types.js";

/** Hidden marker the comment workflow uses to find and update its own comment. */
export const COMMENT_MARKER = "<!-- leaderboard-bot -->";

/**
 * Rank a run would get against the existing leaderboard: other participants'
 * best runs stay as they are, the candidate replaces its own participant's entry.
 */
export function wouldRank(base: LeaderboardData, candidate: Pick<Run, "participant" | "score" | "timestamp">): number {
  const runsById = new Map(base.runs.map((r) => [r.id, r]));
  const better = base.entries.filter((e) => {
    if (e.participant === candidate.participant) return false;
    const best = runsById.get(e.bestRunId);
    const other = { participant: e.participant, score: e.score, timestamp: best?.timestamp ?? 0 };
    return compareRuns(other, candidate) < 0;
  });
  return better.length + 1;
}

export interface SubmissionReport {
  file: string;
  run: Run | null;
  rank: number | null;
  errors: string[];
  warnings: string[];
}

/** Validates each changed *_sum.json and computes the rank it would get. */
export function checkSubmissions(sumPaths: { absolute: string; display: string }[], base: LeaderboardData): SubmissionReport[] {
  return sumPaths.map(({ absolute, display }) => {
    const { run, errors, warnings } = loadRun(absolute);
    return { file: display, run, rank: run ? wouldRank(base, run) : null, errors, warnings };
  });
}

/** Escapes text from submissions so it renders literally (no links, mentions or HTML). */
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!|<>@~]/g, "\\$&").replace(/\r?\n/g, " ");
}

const code = (text: string) => `\`${text.replace(/`/g, "'").replace(/\r?\n/g, " ")}\``;
const ms = (v: number) => `${Number(v.toFixed(2))} ms`;

function verdict(score: number, rank: number, base: LeaderboardData): string {
  const b = base.baseline;
  let suffix = "";
  if (b) {
    if (score > b.score) suffix = ` (beats the baseline ${b.score} 🎉)`;
    else if (score === b.score) suffix = ` (ties the baseline ${b.score})`;
    else suffix = ` (score to beat: ${b.score})`;
  }
  return `**Score: ${score}** — would rank **#${rank}**${suffix}`;
}

export function renderPrComment(reports: SubmissionReport[], base: LeaderboardData, siteUrl: string): string {
  const failed = reports.some((r) => r.errors.length > 0);
  const lines: string[] = [COMMENT_MARKER, "## Leaderboard check", ""];
  lines.push(failed ? "❌ **Validation failed.** Please fix the errors below and push again." : "✅ All submitted results are valid.");
  lines.push("");

  for (const r of reports) {
    lines.push(`### ${code(r.file)}`, "");
    if (r.run && r.rank !== null) {
      const run = r.run;
      const m = run.metrics;
      const d = m.httpReqDuration;
      lines.push(verdict(run.score, r.rank, base), "");
      const current = base.entries.find((e) => e.participant === run.participant);
      if (current) lines.push(`Current best for ${escapeMarkdown(run.participant)}: ${current.score} (#${current.rank}).`, "");
      lines.push(
        "| metric | value |",
        "| - | - |",
        `| participant | ${escapeMarkdown(run.participant)} |`,
        `| checks_total | ${m.checksTotal} |`,
        `| checks_failed | ${m.checksFailed} |`,
        `| checks_succeeded | ${m.checksSucceededPct.toFixed(2)}% |`,
        `| http_reqs/s | ${m.httpReqsRate.toFixed(6)} |`,
        `| http_req_duration med / p90 / p95 | ${ms(d.med)} / ${ms(d.p90)} / ${ms(d.p95)} |`,
        `| http_req_duration avg / max | ${ms(d.avg)} / ${ms(d.max)} |`,
        `| VUs | ${run.vus} |`,
        `| specs | ${run.specs ? escapeMarkdown(run.specs) : "not provided (optional: add meta.json)"} |`,
        "",
      );
    }
    for (const e of r.errors) lines.push(`- ❌ ${escapeMarkdown(e)}`);
    for (const w of r.warnings) lines.push(`- ⚠️ ${escapeMarkdown(w)}`);
    if (r.errors.length || r.warnings.length) lines.push("");
  }

  lines.push(
    "---",
    `<sub>Score = floor(checks_total / (med×0.2 + p90×0.3 + p95×0.5) × (1 − checks_failed/checks_total)^7), computed from the \`*_sum.json\` file. ` +
      `Ranks are provisional until the maintainers review the run. Leaderboard: ${siteUrl}</sub>`,
  );
  return lines.join("\n") + "\n";
}

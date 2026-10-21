import type { LeaderboardData } from "./types.js";

export const README_START = "<!-- LEADERBOARD:START -->";
export const README_END = "<!-- LEADERBOARD:END -->";

const trimNumber = (v: number) => String(Number(v.toFixed(2)));
const escapeCell = (text: string) => text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

/** Renders the "Current Leaderboard" table with the same columns as the hand-edited one. */
export function renderReadmeTable(data: LeaderboardData): string {
  const runsById = new Map(data.runs.map((r) => [r.id, r]));
  const rows = data.entries.map((e) => {
    const run = runsById.get(e.bestRunId)!;
    const m = run.metrics;
    const score = e.isBaseline ? `**${e.score}***` : String(e.score);
    const participant = e.github ? `[${e.participant}](https://github.com/${e.github})` : escapeCell(e.participant);
    return [
      score,
      participant,
      String(m.checksTotal),
      `${m.checksSucceededPct.toFixed(2)}%`,
      `${m.httpReqsRate.toFixed(6)}/s`,
      `${trimNumber(m.httpReqDuration.avg)}ms`,
      run.specs ? escapeCell(run.specs) : "not provided",
    ];
  });
  return [
    "| score | participant | checks_total | checks_succeeded | http_reqs/s | http_req_duration.avg | specs |",
    "| - | - | - | - | - | - | - |",
    ...rows.map((cells) => `| ${cells.join(" | ")} |`),
  ].join("\n");
}

/** Replaces only the content between the LEADERBOARD markers. */
export function updateReadme(readme: string, table: string): string {
  const start = readme.indexOf(README_START);
  const end = readme.indexOf(README_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`README is missing the ${README_START} / ${README_END} markers`);
  }
  const eol = readme.includes("\r\n") ? "\r\n" : "\n";
  const body = table.replace(/\n/g, eol);
  return readme.slice(0, start) + README_START + eol + body + eol + readme.slice(end);
}

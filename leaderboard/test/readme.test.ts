import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildLeaderboard } from "../src/build-data.js";
import { README_END, README_START, renderReadmeTable, updateReadme } from "../src/readme.js";
import { computeScore } from "../src/score.js";
import { addMeta, addRun, FIXTURE_META, FIXTURE_PR2, makeFixtureResults, makeSummary, readJson } from "./helpers.js";

const HEADER = [
  "| score | participant | checks_total | checks_succeeded | http_reqs/s | http_req_duration.avg | specs |",
  "| - | - | - | - | - | - | - |",
];

/** The README row for the fixture baseline, built from the raw fixture files. */
function expectedBaselineRow(participant: string): string {
  const m = readJson(FIXTURE_PR2).metrics;
  const meta = readJson(FIXTURE_META);
  const total = m.checks.passes + m.checks.fails;
  const d = m.http_req_duration;
  const score = computeScore({ checksTotal: total, checksFailed: m.checks.fails, med: d.med, p90: d["p(90)"], p95: d["p(95)"] });
  if (!score.valid) throw new Error(score.reason);
  const cells = [
    `**${score.score}***`,
    `[${participant}](https://github.com/${meta.github})`,
    String(total),
    `${(((total - m.checks.fails) / total) * 100).toFixed(2)}%`,
    `${m.http_reqs.rate.toFixed(6)}/s`,
    `${Number(d.avg.toFixed(2))}ms`,
    meta.specs.replace(/\|/g, "\\|"),
  ];
  return `| ${cells.join(" | ")} |`;
}

describe("README leaderboard block", () => {
  it("renders the baseline row from the fixture files", () => {
    const { results, baseline } = makeFixtureResults();
    const { data } = buildLeaderboard({ resultsDir: results, baselineParticipant: baseline });
    expect(renderReadmeTable(data)).toBe([...HEADER, expectedBaselineRow(baseline)].join("\n"));
  });

  it("adds participants in rank order", () => {
    const { results, baseline } = makeFixtureResults();
    addRun(results, "my_rig", 1780000000, 10, makeSummary({ passes: 200000, avg: 61.70821, rate: 322.1619250064979 }));
    addMeta(results, "my_rig", { specs: "a | b" });
    const lines = renderReadmeTable(buildLeaderboard({ resultsDir: results, baselineParticipant: baseline }).data).split("\n");
    expect(lines.slice(2)).toEqual([expectedBaselineRow(baseline), "| 1769 | my_rig | 200000 | 100.00% | 322.161925/s | 61.71ms | a \\| b |"]);
  });

  it("replaces only the marked block", () => {
    const readme = `# Title\r\n\r\n${README_START}\r\nold\r\n${README_END}\r\n\r\n> footer\r\n`;
    expect(updateReadme(readme, "a\nb")).toBe(`# Title\r\n\r\n${README_START}\r\na\r\nb\r\n${README_END}\r\n\r\n> footer\r\n`);
    expect(() => updateReadme("no markers", "x")).toThrow(/markers/);
  });

  it("the repository README has the leaderboard markers", () => {
    const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
    expect(readme).toContain(README_START);
    expect(readme).toContain(README_END);
  });
});

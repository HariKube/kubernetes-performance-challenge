import { describe, expect, it } from "vitest";
import { buildLeaderboard } from "../src/build-data.js";
import { README_END, README_START, renderReadmeTable, updateReadme } from "../src/readme.js";
import { addMeta, addRun, makeResultsDir, makeSummary, SEED_FILE } from "./helpers.js";

// The hand-edited table as it was in README.md before this change.
const CURRENT_TABLE = `| score | participant | checks_total | checks_succeeded | http_reqs/s | http_req_duration.avg | specs |
| - | - | - | - | - | - | - |
| **1059*** | [mhmxs](https://github.com/mhmxs) | 429180 | 100.00% | 119.106435/s | 167.17ms | 1x Ultra 7 165H 18 Core 4GB |`;

describe("README leaderboard block", () => {
  it("reproduces today's table from the seed baseline", () => {
    const { data } = buildLeaderboard({ resultsDir: makeResultsDir(), seedFile: SEED_FILE });
    expect(renderReadmeTable(data)).toBe(CURRENT_TABLE);
  });

  it("adds participants in rank order", () => {
    const results = makeResultsDir();
    addRun(results, "my_rig", 1780000000, 10, makeSummary({ passes: 200000, avg: 61.70821, rate: 322.1619250064979 }));
    addMeta(results, "my_rig", { specs: "a | b" });
    const lines = renderReadmeTable(buildLeaderboard({ resultsDir: results, seedFile: SEED_FILE }).data).split("\n");
    expect(lines[2]).toBe("| 1769 | my_rig | 200000 | 100.00% | 322.161925/s | 61.71ms | a \\| b |");
    expect(lines[3]).toMatch(/^\| \*\*1059\*\*\* \| \[mhmxs\]/);
  });

  it("replaces only the marked block", () => {
    const readme = `# Title\r\n\r\n${README_START}\r\nold\r\n${README_END}\r\n\r\n> footer\r\n`;
    expect(updateReadme(readme, "a\nb")).toBe(`# Title\r\n\r\n${README_START}\r\na\r\nb\r\n${README_END}\r\n\r\n> footer\r\n`);
    expect(() => updateReadme("no markers", "x")).toThrow(/markers/);
  });
});

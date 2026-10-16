import { describe, expect, it } from "vitest";
import { buildLeaderboard } from "../src/build-data.js";
import { checkSubmissions, COMMENT_MARKER, escapeMarkdown, renderPrComment, wouldRank } from "../src/pr-report.js";
import { addRun, makeResultsDir, makeSummary, SEED_FILE } from "./helpers.js";

const SITE = "https://kubernetes-performance-challenge.github.io";

function baseWithAlice() {
  const results = makeResultsDir();
  addRun(results, "alice", 1780000000, 10, makeSummary({ passes: 200000 })); // 1769
  return buildLeaderboard({ resultsDir: results, seedFile: SEED_FILE }).data;
}

describe("wouldRank", () => {
  const base = baseWithAlice();
  it("ranks against other participants' best runs", () => {
    expect(wouldRank(base, { participant: "bob", score: 2000, timestamp: 1790000000 })).toBe(1);
    expect(wouldRank(base, { participant: "bob", score: 1500, timestamp: 1790000000 })).toBe(2);
    expect(wouldRank(base, { participant: "bob", score: 10, timestamp: 1790000000 })).toBe(3);
  });
  it("a later submission with an equal score ranks below", () => {
    expect(wouldRank(base, { participant: "bob", score: 1769, timestamp: 1790000000 })).toBe(2);
  });
  it("ignores the participant's own existing entry", () => {
    expect(wouldRank(base, { participant: "alice", score: 1100, timestamp: 1790000000 })).toBe(1);
  });
});

describe("renderPrComment", () => {
  it("reports score, rank and baseline comparison", () => {
    const base = buildLeaderboard({ resultsDir: makeResultsDir(), seedFile: SEED_FILE }).data;
    const pr = makeResultsDir();
    const file = addRun(pr, "bob", 1790000000, 20, makeSummary({ passes: 200000 }));
    const reports = checkSubmissions([{ absolute: file, display: "results/bob/1790000000_20_sum.json" }], base);
    const body = renderPrComment(reports, base, SITE);
    expect(body.startsWith(COMMENT_MARKER)).toBe(true);
    expect(body).toContain("**Score: 1769** — would rank **#1** (beats the baseline 1059 🎉)");
    expect(body).toContain("✅ All submitted results are valid.");
  });

  it("lists errors and warnings", () => {
    const base = buildLeaderboard({ resultsDir: makeResultsDir(), seedFile: SEED_FILE }).data;
    const pr = makeResultsDir();
    const file = addRun(pr, "bad_name", 1790000000, 20, makeSummary(), "none");
    const reports = checkSubmissions([{ absolute: file, display: "results/bad_name/1790000000_20_sum.json" }], base);
    const body = renderPrComment(reports, base, SITE);
    expect(body).toContain("❌ **Validation failed.**");
    expect(body).toMatch(/❌ .*missing raw benchmark data/);
    expect(body).toMatch(/⚠️ .*meta\\\.json/);
  });

  it("escapes user-controlled text", () => {
    expect(escapeMarkdown("@someone <img> [x](y)")).toBe("\\@someone \\<img\\> \\[x\\]\\(y\\)");
  });
});

import { describe, expect, it } from "vitest";
import { buildLeaderboard } from "../src/build-data.js";
import { checkSubmissions, COMMENT_MARKER, escapeMarkdown, renderPrComment, wouldRank } from "../src/pr-report.js";
import { addRun, makeFixtureResults, makeResultsDir, makeSummary } from "./helpers.js";

const SITE = "https://kubernetes-performance-challenge.github.io";

/** Fixture baseline plus alice (1769). */
function baseWithAlice() {
  const { results, baseline } = makeFixtureResults();
  addRun(results, "alice", 1780000000, 10, makeSummary({ passes: 200000 })); // 1769
  return buildLeaderboard({ resultsDir: results, baselineParticipant: baseline }).data;
}

describe("wouldRank", () => {
  const base = baseWithAlice();
  const [first, second] = base.entries;
  it("ranks against other participants' best runs", () => {
    expect(base.entries).toHaveLength(2);
    expect(wouldRank(base, { participant: "bob", score: first!.score + 1, timestamp: 1790000000 })).toBe(1);
    expect(wouldRank(base, { participant: "bob", score: second!.score + 1, timestamp: 1790000000 })).toBe(2);
    expect(wouldRank(base, { participant: "bob", score: 10, timestamp: 1790000000 })).toBe(3);
  });
  it("a later submission with an equal score ranks below", () => {
    expect(wouldRank(base, { participant: "bob", score: second!.score, timestamp: 1790000000 })).toBe(3);
  });
  it("ignores the participant's own existing entry", () => {
    expect(wouldRank(base, { participant: second!.participant, score: 10, timestamp: 1790000000 })).toBe(2);
    expect(wouldRank(base, { participant: first!.participant, score: 10, timestamp: 1790000000 })).toBe(2);
  });
});

describe("renderPrComment", () => {
  const { results, baseline } = makeFixtureResults();
  const base = buildLeaderboard({ resultsDir: results, baselineParticipant: baseline }).data;
  const toBeat = base.baseline!.score;

  it("reports score, rank and the score to beat from the baseline participant's run", () => {
    const pr = makeResultsDir();
    const file = addRun(pr, "bob", 1790000000, 20, makeSummary({ passes: 200000 }));
    const reports = checkSubmissions([{ absolute: file, display: "results/bob/1790000000_20_sum.json" }], base);
    const body = renderPrComment(reports, base, SITE);
    expect(body.startsWith(COMMENT_MARKER)).toBe(true);
    expect(body).toContain(`**Score: ${reports[0]!.run!.score}** — would rank **#2** (score to beat: ${toBeat})`);
    expect(body).toContain("✅ All submitted results are valid.");
  });

  it("says when a run beats the baseline", () => {
    const pr = makeResultsDir();
    const file = addRun(pr, "bob", 1790000000, 20, makeSummary({ passes: 100000, med: 1, p90: 1, p95: 1 }));
    const reports = checkSubmissions([{ absolute: file, display: "results/bob/1790000000_20_sum.json" }], base);
    expect(reports[0]!.run!.score).toBeGreaterThan(toBeat);
    expect(renderPrComment(reports, base, SITE)).toContain(`would rank **#1** (beats the baseline ${toBeat} 🎉)`);
  });

  it("lists errors and warnings", () => {
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

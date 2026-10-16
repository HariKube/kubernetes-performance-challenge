import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSummaryText } from "../src/parse.js";
import { computeScore } from "../src/score.js";
import { FIXTURE_PR2 } from "./helpers.js";

describe("computeScore", () => {
  it("README baseline values give 1058 (official score is 1059)", () => {
    // The README shows the baseline latencies rounded to two decimals
    // (med 71.06, p90 398, p95 543.76). Those give 429180 / 405.492 = 1058.42.
    // The official 1059 was computed from the unrounded values in the real
    // results/mhmxs/*_sum.json, which is not in the repository yet. Until it is,
    // the site shows the official score from leaderboard/data/baseline.json.
    // TODO: when the real file arrives, add a test expecting 1059 from it.
    const result = computeScore({ checksTotal: 429180, checksFailed: 0, med: 71.06, p90: 398, p95: 543.76 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.score).toBe(1058);
      expect(result.latencyDenominator).toBeCloseTo(405.492, 6);
    }
  });

  it("scores the PR #2 format sample as 7589", () => {
    const parsed = parseSummaryText(readFileSync(FIXTURE_PR2, "utf8"));
    if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
    const m = parsed.metrics;
    const d = m.httpReqDuration;
    const result = computeScore({ checksTotal: m.checksTotal, checksFailed: m.checksFailed, med: d.med, p90: d.p90, p95: d.p95 });
    expect(result).toMatchObject({ valid: true, score: 7589 });
  });

  it("applies the success penalty pow(1 - failed/total, 7)", () => {
    const base = { checksTotal: 100000, med: 50, p90: 100, p95: 200 };
    const perfect = computeScore({ ...base, checksFailed: 0 });
    const onePct = computeScore({ ...base, checksFailed: 1000 });
    // denominator = 10 + 30 + 100 = 140; 100000 / 140 = 714.2857
    expect(perfect).toMatchObject({ valid: true, score: 714 });
    // 714.2857 * 0.99^7 (0.932065) = 665.76
    expect(onePct).toMatchObject({ valid: true, score: 665 });
    if (onePct.valid) expect(onePct.successFactor).toBeCloseTo(Math.pow(0.99, 7), 12);
  });

  it("all checks failed gives 0", () => {
    expect(computeScore({ checksTotal: 10, checksFailed: 10, med: 1, p90: 1, p95: 1 })).toMatchObject({ valid: true, score: 0 });
  });

  it.each([
    ["checksTotal = 0", { checksTotal: 0, checksFailed: 0, med: 1, p90: 1, p95: 1 }],
    ["missing p95", { checksTotal: 10, checksFailed: 0, med: 1, p90: 1 }],
    ["NaN med", { checksTotal: 10, checksFailed: 0, med: NaN, p90: 1, p95: 1 }],
    ["Infinity p90", { checksTotal: 10, checksFailed: 0, med: 1, p90: Infinity, p95: 1 }],
    ["string value", { checksTotal: "10", checksFailed: 0, med: 1, p90: 1, p95: 1 }],
    ["negative latency", { checksTotal: 10, checksFailed: 0, med: -1, p90: 1, p95: 1 }],
    ["failed > total", { checksTotal: 10, checksFailed: 11, med: 1, p90: 1, p95: 1 }],
    ["zero latencies", { checksTotal: 10, checksFailed: 0, med: 0, p90: 0, p95: 0 }],
  ])("is invalid for %s", (_name, input) => {
    const result = computeScore(input as never);
    expect(result.valid).toBe(false);
  });

  it("is invalid for null input", () => {
    expect(computeScore(null).valid).toBe(false);
    expect(computeScore(undefined).valid).toBe(false);
  });
});

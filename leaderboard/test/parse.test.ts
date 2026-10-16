import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isValidGithubUsername } from "../src/meta.js";
import { findRawFiles, parseSummary, parseSummaryFilename, parseSummaryText } from "../src/parse.js";
import { FIXTURE_PR2, makeSummary } from "./helpers.js";

describe("parseSummary", () => {
  it("extracts metrics from the real k6 summary-export format", () => {
    const parsed = parseSummaryText(readFileSync(FIXTURE_PR2, "utf8"));
    if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
    expect(parsed.metrics).toEqual({
      checksTotal: 1160484,
      checksFailed: 0,
      checksSucceededPct: 100,
      httpReqsRate: 322.1619250064979,
      httpReqsCount: 1160484,
      httpReqFailedRate: 0,
      httpReqDuration: {
        avg: 61.70821367127085,
        min: 1.078091,
        med: 34.075781000000006,
        max: 5298.558359,
        p90: 148.6460713,
        p95: 202.99232444999998,
      },
      vusMax: 20,
    });
  });

  it("computes checks_total = passes + fails and checks_failed = fails", () => {
    const parsed = parseSummary(makeSummary({ passes: 990, fails: 10 }));
    expect(parsed.ok && parsed.metrics).toMatchObject({ checksTotal: 1000, checksFailed: 10, checksSucceededPct: 99 });
  });

  it("uses http_req_failed.value as the failure rate", () => {
    const parsed = parseSummary(makeSummary({ failedRate: 0.25 }));
    expect(parsed.ok && parsed.metrics.httpReqFailedRate).toBe(0.25);
  });

  it("reports missing fields with their path", () => {
    const summary = makeSummary() as { metrics: Record<string, Record<string, unknown>> };
    delete summary.metrics.http_req_duration!["p(95)"];
    delete summary.metrics.checks;
    const parsed = parseSummary(summary);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors.some((e) => e.startsWith("metrics.http_req_duration.p(95)"))).toBe(true);
      expect(parsed.errors.some((e) => e.startsWith("metrics.checks"))).toBe(true);
    }
  });

  it("rejects invalid JSON and the handleSummary format", () => {
    expect(parseSummaryText("{not json").ok).toBe(false);
    expect(parseSummary({ metrics: { checks: { values: { passes: 1, fails: 0 } } } }).ok).toBe(false);
  });
});

describe("parseSummaryFilename", () => {
  it("parses <timestamp>_<vus>_sum.json", () => {
    expect(parseSummaryFilename("1771941557_20_sum.json")).toEqual({ base: "1771941557_20", timestamp: 1771941557, vus: 20 });
  });

  it.each(["1771941557_20.json", "abc_20_sum.json", "1771941557_sum.json", "1771941557_0_sum.json", "123_20_sum.json", "1771941557_20_sum.json.bak"])(
    "rejects %s",
    (name) => expect(parseSummaryFilename(name)).toBeNull(),
  );
});

describe("findRawFiles", () => {
  const files = [
    "1777313300_20_sum.json",
    "1777313300_20.json.zip.ab",
    "1777313300_20.json.zip.aa",
    "1777313300_20_dashboard.html",
    "1777313300_21.json",
    "meta.json",
  ];
  it("finds split zip parts and ignores unrelated files", () => {
    expect(findRawFiles(files, "1777313300_20")).toEqual(["1777313300_20.json.zip.aa", "1777313300_20.json.zip.ab"]);
  });
  it("finds .json and .json.zip", () => {
    expect(findRawFiles(["1_2.json", "1_2.json.zip", "1_2_sum.json"], "1_2")).toEqual(["1_2.json", "1_2.json.zip"]);
  });
  it("returns nothing when raw data is missing", () => {
    expect(findRawFiles(["1_2_sum.json", "1_2_dashboard.html"], "1_2")).toEqual([]);
  });
});

describe("isValidGithubUsername", () => {
  it.each(["mhmxs", "daaain", "a", "a-b-c", "A1", "x".repeat(39)])("accepts %s", (n) => expect(isValidGithubUsername(n)).toBe(true));
  it.each(["daaain-colima-k3s-kine-pg-tmpfs-and-replica-x", "-a", "a-", "a--b", "a_b", "a.b", "", "x".repeat(40)])("rejects %s", (n) =>
    expect(isValidGithubUsername(n)).toBe(false),
  );
});

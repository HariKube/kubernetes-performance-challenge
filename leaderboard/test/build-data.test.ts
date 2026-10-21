import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildLeaderboard } from "../src/build-data.js";
import { loadConfig, parseConfig } from "../src/config.js";
import { loadRun } from "../src/run.js";
import {
  addMeta,
  addRun,
  FIXTURE_CONFIG,
  FIXTURE_META,
  FIXTURE_PR2,
  makeFixtureResults,
  makeResultsDir,
  makeSummary,
  readJson,
  REPO_CONFIG,
  REPO_RESULTS,
} from "./helpers.js";

const NOW = new Date("2026-10-16T00:00:00Z");
const build = (resultsDir: string, baselineParticipant: string | null = null) =>
  buildLeaderboard({ resultsDir, baselineParticipant, now: NOW });

describe("buildLeaderboard", () => {
  it("is empty when results/ is empty", () => {
    const { data, errors } = build(makeResultsDir(), loadConfig(FIXTURE_CONFIG).baselineParticipant);
    expect(errors).toEqual([]);
    expect(data.entries).toEqual([]);
    expect(data.runs).toEqual([]);
    expect(data.baseline).toBeNull();
  });

  it("takes the baseline participant from the config and scores it from its best run", () => {
    const { results, baseline } = makeFixtureResults();
    expect(baseline).toBe(readJson(FIXTURE_CONFIG).baselineParticipant);
    const better = addRun(results, baseline, 1770000900, 20, makeSummary({ passes: 1, med: 1000, p90: 1000, p95: 1000 }));
    addRun(results, "alice", 1780000000, 10);
    const { data, errors } = build(results, loadConfig(FIXTURE_CONFIG).baselineParticipant);
    expect(errors).toEqual([]);

    const best = loadRun(join(results, baseline, "1770000000_20_sum.json")).run!;
    expect(best.score).toBeGreaterThan(loadRun(better).run!.score);
    expect(data.baseline).toEqual({ participant: baseline, score: best.score, runId: best.id });
    expect(data.entries.filter((e) => e.isBaseline).map((e) => e.participant)).toEqual([baseline]);
    expect(data.runs.filter((r) => r.isBaseline)).toHaveLength(2);
    expect(data.runs.find((r) => r.participant === "alice")!.isBaseline).toBe(false);
    expect(data.runs.find((r) => r.id === best.id)).toMatchObject({ specs: readJson(FIXTURE_META).specs, github: readJson(FIXTURE_META).github });
  });

  it("follows the config when another participant is configured", () => {
    const { results } = makeFixtureResults();
    addRun(results, "alice", 1780000000, 10);
    const { data } = build(results, parseConfig({ baselineParticipant: "alice" }).baselineParticipant);
    expect(data.baseline?.participant).toBe("alice");
    expect(data.entries.filter((e) => e.isBaseline).map((e) => e.participant)).toEqual(["alice"]);
  });

  it("has no baseline when the configured participant has no valid run", () => {
    const { results } = makeFixtureResults();
    const { data } = build(results, "nobody");
    expect(data.baseline).toBeNull();
    expect(data.entries.some((e) => e.isBaseline)).toBe(false);
  });

  it("the repository config names a participant with a valid run in results/", () => {
    const { baselineParticipant } = loadConfig(REPO_CONFIG);
    expect(existsSync(join(REPO_RESULTS, baselineParticipant))).toBe(true);
    const { data, errors } = build(REPO_RESULTS, baselineParticipant);
    expect(errors).toEqual([]);
    const entry = data.entries.find((e) => e.participant === baselineParticipant)!;
    expect(data.baseline).toEqual({ participant: baselineParticipant, score: entry.score, runId: entry.bestRunId });
  });

  it("ranks one row per participant using the best run and keeps all runs", () => {
    const results = makeResultsDir();
    addRun(results, "alice", 1780000000, 10, makeSummary({ passes: 100000 })); // 100000/(8+30+75)=884
    addRun(results, "alice", 1780000100, 50, makeSummary({ passes: 200000 })); // 1769
    addRun(results, "bob", 1780000050, 20, makeSummary({ passes: 150000 })); // 1327
    const { data } = build(results);
    expect(data.entries.map((e) => [e.rank, e.participant, e.score])).toEqual([
      [1, "alice", 1769],
      [2, "bob", 1327],
    ]);
    const alice = data.entries[0]!;
    expect(alice.bestRunId).toBe("alice-1780000100-50");
    expect(alice.runIds).toEqual(["alice-1780000100-50", "alice-1780000000-10"]);
    expect(data.runs).toHaveLength(3);
    expect(data.runs[0]!.summaryFile.url).toBe(
      "https://github.com/HariKube/kubernetes-performance-challenge/blob/main/results/alice/1780000100_50_sum.json",
    );
  });

  it("ties: the earlier submission ranks higher", () => {
    const results = makeResultsDir();
    addRun(results, "zed", 1780000000, 10);
    addRun(results, "amy", 1780000500, 10);
    const { data } = build(results);
    const [first, second] = data.entries;
    expect(first!.score).toBe(second!.score);
    expect([first!.participant, second!.participant]).toEqual(["zed", "amy"]);
  });

  it("uses the participant's earliest run when their own runs tie", () => {
    const results = makeResultsDir();
    addRun(results, "alice", 1780000900, 10);
    addRun(results, "alice", 1780000000, 20);
    expect(build(results).data.entries.find((e) => e.participant === "alice")!.bestRunId).toBe("alice-1780000000-20");
  });

  it("reads specs/github from meta.json and lists participants without specs", () => {
    const results = makeResultsDir();
    addRun(results, "alice", 1780000000, 10);
    addMeta(results, "alice", { specs: "3x 64 core", notes: "tuned etcd" });
    addRun(results, "daaain-colima-k3s-kine-pg-tmpfs-and-replica-test", 1780000000, 10);
    addRun(results, "carol-cluster-v2", 1780000000, 10);
    addMeta(results, "carol-cluster-v2", { github: "carol" });
    const { data } = build(results);
    const byName = new Map(data.runs.map((r) => [r.participant, r]));
    expect(byName.get("alice")).toMatchObject({ specs: "3x 64 core", notes: "tuned etcd", github: "alice" });
    expect(byName.get("carol-cluster-v2")?.github).toBe("carol");
    expect(byName.get("daaain-colima-k3s-kine-pg-tmpfs-and-replica-test")?.github).toBeNull();
    expect(data.missingSpecs).toEqual(["carol-cluster-v2", "daaain-colima-k3s-kine-pg-tmpfs-and-replica-test"]);
    expect(data.warnings.some((w) => w.includes("not a valid GitHub username"))).toBe(true);
  });

  it("leaves out invalid files and reports them", () => {
    const results = makeResultsDir();
    addRun(results, "alice", 1780000000, 10, "{broken");
    addRun(results, "bob", 1780000000, 10, makeSummary(), "none");
    addRun(results, "carol", 1780000000, 10, makeSummary({ passes: 0, fails: 0 }));
    const { data, errors } = build(results);
    expect(data.entries).toEqual([]);
    expect(errors).toHaveLength(3);
    expect(errors.join("\n")).toMatch(/invalid JSON/);
    expect(errors.join("\n")).toMatch(/missing raw benchmark data/);
    expect(errors.join("\n")).toMatch(/checksTotal is 0/);
  });
});

describe("parseConfig", () => {
  it("rejects a config without baselineParticipant", () => {
    expect(() => parseConfig({})).toThrow(/baselineParticipant/);
  });
});

describe("loadRun (validate)", () => {
  it.each(["json", "zip", "parts"] as const)("accepts raw data as %s", (raw) => {
    const results = makeResultsDir();
    const { run, errors } = loadRun(addRun(results, "alice", 1780000000, 10, makeSummary(), raw));
    expect(errors).toEqual([]);
    expect(run?.rawFiles.length).toBe(raw === "parts" ? 2 : 1);
  });

  it("accepts the PR #2 format sample", () => {
    const { run, errors } = loadRun(addRun(makeResultsDir(), "alice", 1780000000, 10, readJson(FIXTURE_PR2)));
    expect(errors).toEqual([]);
    expect(run?.isBaseline).toBe(false);
  });

  it("fails with a clear message when raw data is missing", () => {
    const { run, errors } = loadRun(addRun(makeResultsDir(), "alice", 1780000000, 10, makeSummary(), "none"));
    expect(run).toBeNull();
    expect(errors[0]).toContain("missing raw benchmark data. Expected results/alice/1780000000_10.json");
  });

  it("warns (does not fail) when no GitHub username can be determined", () => {
    const { run, errors, warnings } = loadRun(addRun(makeResultsDir(), "my_cluster", 1780000000, 10));
    expect(errors).toEqual([]);
    expect(run?.github).toBeNull();
    expect(warnings[0]).toContain("meta.json");
  });

  it("warns and ignores an invalid meta.json", () => {
    const results = makeResultsDir();
    addMeta(results, "alice", "{nope");
    const { run, warnings } = loadRun(addRun(results, "alice", 1780000000, 10));
    expect(run?.specs).toBeNull();
    expect(warnings[0]).toContain("meta.json is not valid JSON");
  });
});

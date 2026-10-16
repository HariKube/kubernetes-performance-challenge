import { describe, expect, it } from "vitest";
import { buildLeaderboard } from "../src/build-data.js";
import { loadRun } from "../src/run.js";
import { SEED_SOURCE_NOTE } from "../src/seed.js";
import { addMeta, addRun, makeResultsDir, makeSummary, SEED_FILE } from "./helpers.js";

const build = (resultsDir: string) => buildLeaderboard({ resultsDir, seedFile: SEED_FILE, now: new Date("2026-10-16T00:00:00Z") });

describe("buildLeaderboard", () => {
  it("shows only the seed baseline (official 1059) when results/ is empty", () => {
    const { data, errors } = build(makeResultsDir());
    expect(errors).toEqual([]);
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]).toMatchObject({ rank: 1, participant: "mhmxs", score: 1059, isBaseline: true });
    expect(data.baseline).toEqual({ participant: "mhmxs", score: 1059, runId: "mhmxs-1771941557-20" });
    const run = data.runs[0]!;
    expect(run).toMatchObject({ source: "seed", sourceNote: SEED_SOURCE_NOTE, specs: "1x Ultra 7 165H 18 Core 4GB", summaryFile: null });
    expect(run.date).toBe("2026-02-24T13:59:17.000Z");
    expect(data.missingSpecs).toEqual([]);
  });

  it("a real results/mhmxs/*_sum.json overrides the seed completely", () => {
    const results = makeResultsDir();
    addRun(results, "mhmxs", 1771941557, 20, makeSummary({ passes: 429180, med: 71.06, p90: 398, p95: 543.76 }));
    const { data } = build(results);
    expect(data.runs).toHaveLength(1);
    expect(data.runs[0]).toMatchObject({ source: "results", score: 1058, sourceNote: null, specs: null, isBaseline: true });
    expect(data.runs[0]!.summaryFile?.url).toBe(
      "https://github.com/HariKube/kubernetes-performance-challenge/blob/main/results/mhmxs/1771941557_20_sum.json",
    );
    expect(data.baseline?.score).toBe(1058);
    expect(data.missingSpecs).toEqual(["mhmxs"]);
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
      [3, "mhmxs", 1059],
    ]);
    const alice = data.entries[0]!;
    expect(alice.bestRunId).toBe("alice-1780000100-50");
    expect(alice.runIds).toEqual(["alice-1780000100-50", "alice-1780000000-10"]);
    expect(data.runs).toHaveLength(4);
  });

  it("ties: the earlier submission ranks higher", () => {
    const results = makeResultsDir();
    addRun(results, "zed", 1780000000, 10);
    addRun(results, "amy", 1780000500, 10);
    const { data } = build(results);
    const [first, second] = data.entries.filter((e) => !e.isBaseline);
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
    expect(data.entries.map((e) => e.participant)).toEqual(["mhmxs"]);
    expect(errors).toHaveLength(3);
    expect(errors.join("\n")).toMatch(/invalid JSON/);
    expect(errors.join("\n")).toMatch(/missing raw benchmark data/);
    expect(errors.join("\n")).toMatch(/checksTotal is 0/);
  });
});

describe("loadRun (validate)", () => {
  it.each(["json", "zip", "parts"] as const)("accepts raw data as %s", (raw) => {
    const results = makeResultsDir();
    const { run, errors } = loadRun(addRun(results, "alice", 1780000000, 10, makeSummary(), raw));
    expect(errors).toEqual([]);
    expect(run?.rawFiles.length).toBe(raw === "parts" ? 2 : 1);
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

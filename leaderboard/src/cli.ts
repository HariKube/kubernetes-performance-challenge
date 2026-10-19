import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { buildLeaderboard } from "./build-data.js";
import { loadConfig } from "./config.js";
import { parseSummaryFilename, parseSummaryText } from "./parse.js";
import { checkSubmissions, renderPrComment } from "./pr-report.js";
import { renderReadmeTable, updateReadme } from "./readme.js";
import { loadRun } from "./run.js";
import { computeScore } from "./score.js";
import type { LeaderboardData } from "./types.js";

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PKG_ROOT, "..");
const DEFAULTS = {
  results: resolve(REPO_ROOT, "results"),
  config: resolve(PKG_ROOT, "config.json"),
  out: resolve(PKG_ROOT, "site/public/leaderboard.json"),
  readme: resolve(REPO_ROOT, "README.md"),
};
const SITE_URL = process.env.SITE_URL ?? "https://kubernetes-performance-challenge.github.io";

// `npm run` changes cwd to the package folder; resolve user paths against where npm was invoked.
const userPath = (p: string) => (isAbsolute(p) ? p : resolve(process.env.INIT_CWD ?? process.cwd(), p));

const USAGE = `Usage:
  npm run score -- <file_sum.json>              Print score and metrics for one summary file
  npm run build-data [-- --results <dir> --out <file> --config <file>]
                                                Write leaderboard.json (default: site/public/leaderboard.json)
  npm run validate -- <files_sum.json...>       Validate submissions; exits 1 on any error
  npm run readme [-- --check]                   Regenerate the README leaderboard block
  npm run pr-report -- --base <leaderboard.json> --files-from <list> --out <comment.md> [--repo-root <dir>]
                                                Used by CI: markdown comment for a PR; exits 1 on any error`;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function cmdScore(args: string[]) {
  const [file] = args;
  if (!file) fail(USAGE);
  const parsed = parseSummaryText(readFileSync(userPath(file), "utf8"));
  if (!parsed.ok) fail(`✖ ${file}\n${parsed.errors.map((e) => `  - ${e}`).join("\n")}`);
  const m = parsed.metrics;
  const d = m.httpReqDuration;
  const result = computeScore({ checksTotal: m.checksTotal, checksFailed: m.checksFailed, med: d.med, p90: d.p90, p95: d.p95 });
  if (!result.valid) fail(`✖ ${file}: cannot compute score: ${result.reason}`);
  const name = parseSummaryFilename(file.split(/[\\/]/).pop()!);
  console.log(`score: ${result.score}  (unfloored ${result.raw.toFixed(4)})`);
  console.log(`  checks_total ........ ${m.checksTotal}`);
  console.log(`  checks_failed ....... ${m.checksFailed}`);
  console.log(`  checks_succeeded .... ${m.checksSucceededPct.toFixed(2)}%`);
  console.log(`  http_reqs/s ......... ${m.httpReqsRate.toFixed(6)}`);
  console.log(`  http_req_failed ..... ${(m.httpReqFailedRate * 100).toFixed(2)}%`);
  console.log(`  http_req_duration ... avg=${d.avg} min=${d.min} med=${d.med} max=${d.max} p90=${d.p90} p95=${d.p95} (ms)`);
  console.log(`  latency denominator . ${result.latencyDenominator.toFixed(4)} ms`);
  console.log(`  success factor ...... ${result.successFactor.toFixed(6)}`);
  if (name) console.log(`  run ................. ${new Date(name.timestamp * 1000).toISOString()}, ${name.vus} VUs`);
}

function build(results: string, config: string): LeaderboardData {
  const { baselineParticipant } = loadConfig(config);
  const { data, errors } = buildLeaderboard({ resultsDir: results, baselineParticipant });
  for (const e of errors) console.error(`warning: skipped invalid file: ${e}`);
  return data;
}

function cmdBuildData(args: string[]) {
  const { values } = parseArgs({ args, options: { results: { type: "string" }, out: { type: "string" }, config: { type: "string" } } });
  const out = values.out ? userPath(values.out) : DEFAULTS.out;
  const data = build(values.results ? userPath(values.results) : DEFAULTS.results, values.config ? userPath(values.config) : DEFAULTS.config);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
  console.log(`Wrote ${out}: ${data.entries.length} participant(s), ${data.runs.length} run(s).`);
  for (const e of data.entries) console.log(`  #${e.rank} ${e.participant} ${e.score}${e.isBaseline ? " (score to beat)" : ""}`);
  if (data.missingSpecs.length) console.log(`Missing specs: ${data.missingSpecs.join(", ")}`);
  for (const w of data.warnings) console.log(`warning: ${w}`);
}

function cmdValidate(args: string[]) {
  if (args.length === 0) fail(USAGE);
  let failed = 0;
  for (const file of args) {
    const { run, errors, warnings } = loadRun(userPath(file));
    if (errors.length) {
      failed++;
      console.error(`✖ ${file}`);
      errors.forEach((e) => console.error(`  - ${e}`));
    } else {
      console.log(`✔ ${file}  score ${run!.score}`);
    }
    warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  }
  if (failed) fail(`${failed} of ${args.length} file(s) failed validation.`);
}

function cmdReadme(args: string[]) {
  const { values } = parseArgs({ args, options: { check: { type: "boolean" }, readme: { type: "string" } } });
  const file = values.readme ? userPath(values.readme) : DEFAULTS.readme;
  const current = readFileSync(file, "utf8");
  const next = updateReadme(current, renderReadmeTable(build(DEFAULTS.results, DEFAULTS.config)));
  if (values.check) {
    if (next !== current) fail("README leaderboard block is out of date. Run: npm run readme");
    console.log("README leaderboard block is up to date.");
    return;
  }
  writeFileSync(file, next);
  console.log(next === current ? "README leaderboard block already up to date." : `Updated ${file}`);
}

function cmdPrReport(args: string[]) {
  const { values } = parseArgs({
    args,
    options: { base: { type: "string" }, "files-from": { type: "string" }, out: { type: "string" }, "repo-root": { type: "string" } },
  });
  if (!values.base || !values["files-from"] || !values.out) fail(USAGE);
  const repoRoot = values["repo-root"] ? userPath(values["repo-root"]) : REPO_ROOT;
  const base = JSON.parse(readFileSync(userPath(values.base), "utf8")) as LeaderboardData;
  const files = readFileSync(userPath(values["files-from"]), "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const reports = checkSubmissions(
    files.map((f) => ({ absolute: resolve(repoRoot, f), display: f })),
    base,
  );
  writeFileSync(userPath(values.out), renderPrComment(reports, base, SITE_URL));
  for (const r of reports) {
    console.log(`${r.errors.length ? "✖" : "✔"} ${r.file}${r.run ? `  score ${r.run.score}, would rank #${r.rank}` : ""}`);
    r.errors.forEach((e) => console.error(`  - ${e}`));
    r.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  }
  if (reports.some((r) => r.errors.length)) process.exit(1);
}

const [command, ...rest] = process.argv.slice(2);
const commands: Record<string, (args: string[]) => void> = {
  score: cmdScore,
  "build-data": cmdBuildData,
  validate: cmdValidate,
  readme: cmdReadme,
  "pr-report": cmdPrReport,
};
const handler = command ? commands[command] : undefined;
if (!handler) fail(USAGE);
handler(rest);

# Leaderboard

Automated scoring, PR checks and the static leaderboard site for the Kubernetes Performance Challenge.
Everything is generated from the files in [`results/`](../results); there is no backend and no database.

```
leaderboard/
├── src/                 scoring library + CLI (TypeScript, Node 22+)
│   ├── score.ts         score formula
│   ├── parse.ts         k6 summary schema (zod), filename + raw data file rules
│   ├── meta.ts          optional results/<user>/meta.json
│   ├── run.ts           load + validate one *_sum.json
│   ├── config.ts        leaderboard/config.json (baseline participant)
│   ├── build-data.ts    leaderboard.json: ranking, best run per participant
│   ├── pr-report.ts     PR comment markdown + would-be rank
│   ├── readme.ts        README "Current Leaderboard" block
│   └── cli.ts           npm scripts
├── config.json          { "baselineParticipant": "<results folder>" }
├── test/                vitest unit tests (+ fixtures/)
└── site/                Next.js static site (separate package)
```

## How scoring works

- Only `results/<participant>/<timestamp>_<vus>_sum.json` is used for scoring. It is the file written by
  `k6 run --summary-export` (see the [Makefile](../Makefile)): `<timestamp>` is unix seconds, `<vus>` is `K6_VUS`.
- `checks_total = metrics.checks.passes + metrics.checks.fails`, `checks_failed = metrics.checks.fails`,
  latencies from `metrics.http_req_duration` (`med`, `p(90)`, `p(95)`, in ms).
- Score: `floor(checks_total / (med*0.2 + p90*0.3 + p95*0.5) * pow(1 - checks_failed/checks_total, 7))`.
  Invalid input (missing fields, `checks_total = 0`, …) is rejected; the score is never NaN or Infinity.
- Every summary needs its raw benchmark data next to it: `<timestamp>_<vus>.json`, `<timestamp>_<vus>.json.zip`
  or split parts `<timestamp>_<vus>.json.zip.*`. The raw file is never read, only its presence is checked.
  Other files (e.g. `*_dashboard.html`) are ignored.
- Ranking: one row per participant using their best run; all runs get a detail page. On equal scores the earlier
  submission ranks higher.
- The participant name is the folder name. Avatar and profile link use `meta.json` `github`, else the folder name
  if it is a valid GitHub username, else an initials placeholder (the PR check warns in that case).

Optional `results/<participant>/meta.json`:

```json
{ "github": "your-github-username", "specs": "3x 16 vCPU 64GB, NVMe", "notes": "" }
```

### Baseline

The "score to beat" is the best run of the participant named in [`config.json`](config.json)
(`baselineParticipant`). It is scored like every other submission; no score is hard-coded anywhere. The site,
the PR comment, the README table and the worked example on the rules page all take it from the generated data.

The files in `results/mhmxs/` are currently a hand-crafted placeholder: `1771941557_20_sum.json` uses the
k6 summary-export structure with the values shown in the README (latencies rounded to two decimals), and
`1771941557_20.json` stands in for the raw data. The maintainer will replace them with the original benchmark files;
the leaderboard picks up the new score automatically.

## Run locally

```sh
cd leaderboard
npm ci
npm test                                   # unit tests
npm run typecheck

npm run score -- ../results/<user>/<ts>_<vus>_sum.json      # score + metrics for one file
npm run validate -- ../results/<user>/*_sum.json            # exits 1 on errors
npm run build-data                         # writes site/public/leaderboard.json
npm run readme                             # regenerates the README leaderboard block (--check to verify only)
```

Paths are resolved relative to the directory you run npm from, so `npm --prefix leaderboard run score -- results/...`
works from the repository root too.

Site:

```sh
cd leaderboard/site
npm ci
npm run data      # = npm --prefix .. run build-data
npm run dev       # http://localhost:3000
npm run build     # static export to site/out/
npx serve out     # or any static file server
```

`BASE_PATH` (default empty) sets a Next.js base path if the site is ever served from a subpath;
`NEXT_PUBLIC_SITE_URL` (default `https://kubernetes-performance-challenge.github.io`) is used for Open Graph URLs.

The data file is published at `/leaderboard.json` so other pages can `fetch()` it. Shape (see `src/types.ts`):
`{ schemaVersion, generatedAt, repository, baseline, entries[], runs[], missingSpecs[], warnings[] }`.

## GitHub Actions

| Workflow | Trigger | Permissions | What it does |
| - | - | - | - |
| `leaderboard-pr-check.yml` | `pull_request` on `results/**`, `leaderboard/**` | `contents: read` | Runs tests, validates changed `*_sum.json` files (schema, filename, raw data file), computes score and rank against the base branch, uploads the comment text + PR number as an artifact. Fails on validation errors. |
| `leaderboard-pr-comment.yml` | `workflow_run` of the check | `pull-requests: write`, `actions: read` | Downloads the artifact and creates or updates a single comment (hidden marker `<!-- leaderboard-bot -->`). |
| `leaderboard-deploy.yml` | push to `main` on `results/**`, `leaderboard/**`; manual | `contents: read` | Builds data + site and pushes `site/out` to the Pages repository. |

Security model: the check runs the PR's code but only with a read-only token. The comment workflow has write access
but never checks out or runs PR code; it treats the artifact as untrusted (the PR number must be numeric and match the
run's head SHA and repository, `@mentions` are neutralised, size is capped). `workflow_run` workflows only run from the
default branch, so PR comments start working after this is merged to `main`.

## Deploy setup (maintainer, one time)

1. Create the GitHub organization **`kubernetes-performance-challenge`** and in it the public repository
   **`kubernetes-performance-challenge.github.io`**. In that repository, go to Settings → Pages and set
   *Source: Deploy from a branch*, branch **`main`**, folder **`/ (root)`**. (If `main` does not exist yet, the
   first deploy creates it; set the Pages source afterwards.)
2. Generate an SSH key pair locally:
   ```sh
   ssh-keygen -t ed25519 -C "leaderboard-deploy" -f deploy_key -N ""
   ```
3. In `kubernetes-performance-challenge/kubernetes-performance-challenge.github.io` → Settings → Deploy keys →
   *Add deploy key*: paste the contents of `deploy_key.pub`, and tick **Allow write access**.
4. In `HariKube/kubernetes-performance-challenge` → Settings → Secrets and variables → Actions →
   *New repository secret*: name **`PAGES_DEPLOY_KEY`**, value = the contents of the private key file `deploy_key`.
   Then delete both key files locally.
5. Run the deploy workflow once manually: Actions → *Leaderboard deploy* → *Run workflow* (branch `main`).
   The site is then live at https://kubernetes-performance-challenge.github.io and redeploys on every merge that
   touches `results/` or `leaderboard/`.

Until the secret exists, the deploy workflow still builds the site and ends with a "Deploy skipped" notice.

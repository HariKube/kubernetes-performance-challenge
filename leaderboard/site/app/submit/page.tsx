import type { Metadata } from "next";
import Link from "next/link";
import { REPO_URL } from "../../lib/site";

export const metadata: Metadata = {
  title: "How to submit",
  description: "Run the k6 benchmark against your Kubernetes cluster and submit your results via pull request.",
};

export default function SubmitPage() {
  return (
    <div className="prose">
      <h1>How to submit</h1>
      <p>
        Results are submitted as a pull request to <a href={REPO_URL}>the challenge repository</a>. Please read the{" "}
        <Link href="/rules/">rules</Link> first.
      </p>

      <h2>1. Bring your own Kubernetes</h2>
      <p>
        Deploy a cluster of your choice. RBAC, admission controllers and standard API validation must stay enabled, and the
        system has to survive a restart without helper scripts.
      </p>

      <h2>2. Run the benchmark</h2>
      <p>
        Clone the repository and run <code>make</code> to see the targets and variables. The benchmark is the{" "}
        <a href={`${REPO_URL}/blob/main/k6_custom_resource_6_read_write.js`}>k6 test</a> in the repository; it runs for one
        hour.
      </p>
      <pre>
        <code>{`git clone ${REPO_URL}.git
cd kubernetes-performance-challenge
make                      # show targets and variables
make start K6_VUS=20      # or: make start-devbox / make start-docker`}</code>
      </pre>
      <p>
        <code>K6_VUS</code> sets the concurrency (virtual users). The results folder is named after <code>K6_NAME</code>,
        which defaults to <code>$USER</code>. Using your GitHub username here shows your avatar on the leaderboard, e.g.{" "}
        <code>make start K6_NAME=your-github-username</code>.
      </p>
      <p>Each run writes two files:</p>
      <ul>
        <li>
          <code>results/${"{USER}"}/&lt;timestamp&gt;_&lt;vus&gt;_sum.json</code> &ndash; the k6 summary, used to calculate
          the score
        </li>
        <li>
          <code>results/${"{USER}"}/&lt;timestamp&gt;_&lt;vus&gt;.json</code> &ndash; the collected benchmark data
        </li>
      </ul>
      <p>
        GitHub rejects files larger than 100&nbsp;MB. If the data file is too large, you can zip it (
        <code>&lt;timestamp&gt;_&lt;vus&gt;.json.zip</code>) or split the zip into parts (
        <code>&lt;timestamp&gt;_&lt;vus&gt;.json.zip.aa</code>, <code>.ab</code>, &hellip;).
      </p>

      <h2>3. Optional: describe your setup</h2>
      <p>
        Add <code>results/${"{USER}"}/meta.json</code> to show your cluster specs on the leaderboard. If your folder name is
        not your GitHub username, set <code>github</code> so your avatar and profile link work.
      </p>
      <pre>
        <code>{`{
  "github": "your-github-username",
  "specs": "3x 16 vCPU 64GB, NVMe",
  "notes": "Anything you want to share about the setup"
}`}</code>
      </pre>

      <h2>4. Open a pull request</h2>
      <ul>
        <li>
          Commit both files (and optionally <code>meta.json</code>) under <code>results/${"{USER}"}/</code> and open a pull
          request.
        </li>
        <li>
          A bot validates the files and comments the calculated score and the rank it would get. If something is wrong, the
          comment explains what to fix.
        </li>
        <li>You do not need to edit the leaderboard in README.md; it is generated from the results.</li>
        <li>After the maintainers review and merge the pull request, this site is updated automatically.</li>
      </ul>
    </div>
  );
}

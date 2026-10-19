import type { Metadata } from "next";
import Link from "next/link";
import { computeScore, LATENCY_WEIGHTS, SUCCESS_EXPONENT } from "../../../src/score";
import { getBaselineRun, type Run } from "../../lib/data";
import styles from "./rules.module.css";

export const metadata: Metadata = {
  title: "Rules & scoring",
  description: "Rules, prizes and the score formula of the Kubernetes Performance Challenge, with a worked example.",
};

// Rules and prize text below is taken from the repository README; keep the two in sync.

const n = (v: number, digits = 4) => String(Number(v.toFixed(digits)));

function WorkedExample({ run }: { run: Run }) {
  const m = run.metrics;
  const d = m.httpReqDuration;
  const w = LATENCY_WEIGHTS;
  const result = computeScore({ checksTotal: m.checksTotal, checksFailed: m.checksFailed, med: d.med, p90: d.p90, p95: d.p95 });
  if (!result.valid) return null;

  return (
    <>
      <h3>Worked example: the baseline ({run.participant})</h3>
      <ol className={styles.steps}>
        <li>
          <strong>Weighted latency</strong> (the denominator):
          <pre>
            <code>
              {`med×${w.med} + p90×${w.p90} + p95×${w.p95}\n= ${n(d.med)}×${w.med} + ${n(d.p90)}×${w.p90} + ${n(d.p95)}×${w.p95}\n= ${n(d.med * w.med)} + ${n(d.p90 * w.p90)} + ${n(d.p95 * w.p95)}\n= ${n(result.latencyDenominator)} ms`}
            </code>
          </pre>
        </li>
        <li>
          <strong>Throughput per latency</strong>:
          <pre>
            <code>
              {`checks_total / weighted latency = ${m.checksTotal} / ${n(result.latencyDenominator)} = ${n(m.checksTotal / result.latencyDenominator)}`}
            </code>
          </pre>
        </li>
        <li>
          <strong>Success factor</strong>:
          <pre>
            <code>{`(1 − checks_failed / checks_total)^${SUCCESS_EXPONENT} = (1 − ${m.checksFailed} / ${m.checksTotal})^${SUCCESS_EXPONENT} = ${n(result.successFactor, 6)}`}</code>
          </pre>
        </li>
        <li>
          <strong>Multiply and round down</strong>: floor({n(result.raw)}) = <strong>{result.score}</strong>.
        </li>
      </ol>
    </>
  );
}

export default function RulesPage() {
  const baseline = getBaselineRun();
  const penalty = (failedShare: number) => Math.pow(1 - failedShare, SUCCESS_EXPONENT);

  return (
    <div className="prose">
      <h1>Rules &amp; scoring</h1>

      <h2>The Challenge</h2>
      <p>
        Participants are invited to execute standardized performance tests against the Kubernetes to measure latency,
        throughput, and system stability.
      </p>
      <blockquote>Participation is free and requires no purchase.</blockquote>

      <h2>The Grand Prize</h2>
      <p>The ultimate reward for pushing the boundaries of cloud engineering.</p>
      <p>
        Every participant who achieves a higher score than ours will receive a custom-manufactured, limited-edition technical
        shirt.
      </p>
      <p>The Design:</p>
      <ul>
        <li>Front: Kubernetes Performance Challenge</li>
        <li>Back: I BEAT HARIKUBE</li>
        <li>
          Sleeve: Your specific performance metrics (like number of objects, latencies, and success rate) printed as a
          permanent record of your achievement.
        </li>
      </ul>

      <h3>The &ldquo;First Ten&rdquo; Grant</h3>
      <p>
        The first 10 participants to submit a valid benchmark report (regardless of their final ranking) will receive a
        exclusive one-year HariKube <a href="https://harikube.info/editions/">Pro Edition</a> License.
      </p>

      <h3>The &ldquo;Second Chance&rdquo; Draw</h3>
      <p>
        Don&rsquo;t be discouraged if you missed the first ten or couldn&rsquo;t beat our score. At the conclusion of the
        challenge, one additional HariKube <a href="https://harikube.info/editions/">Pro Edition</a> License will be raffled
        off among all participants who submitted a valid report but haven&rsquo;t won through the other categories.
      </p>

      <h2>Contest Period</h2>
      <ul>
        <li>TBD</li>
      </ul>

      <h2 id="score">Score calculation</h2>
      <pre className={styles.formula}>
        <code>
          {"floor(checks_total / (http_req_duration.med*0.2 + http_req_duration.p90*0.3 + http_req_duration.p95*0.5) * pow(1 - checks_failed / checks_total, 7))"}
        </code>
      </pre>
      <blockquote>http_req_duration counted in ms</blockquote>
      <p>In plain words:</p>
      <ul>
        <li>
          <strong>More checks is better.</strong> checks_total is the number of checked requests completed in the one-hour
          run.
        </li>
        <li>
          <strong>Lower latency is better.</strong> The median, p90 and p95 request durations are combined with weights 0.2,
          0.3 and 0.5, so tail latency counts the most.
        </li>
        <li>
          <strong>Failures are expensive.</strong> The success rate is raised to the 7th power: with 1% failed checks the
          score is multiplied by {n(penalty(0.01))} (about {Math.round((1 - penalty(0.01)) * 100)}% lower), with 5% by{" "}
          {n(penalty(0.05))} (about {Math.round((1 - penalty(0.05)) * 100)}% lower).
        </li>
        <li>The score is calculated from the k6 summary file (*_sum.json) only.</li>
      </ul>
      {baseline && <WorkedExample run={baseline} />}

      <h2>Rules and Constraints</h2>
      <p>To ensure valid and comparable results, all participants must adhere to the following constraints:</p>
      <ul>
        <li>
          <strong>Discussion Protocol</strong>: Upon completion of the challenge, all winners (who beat our score) will be
          invited to a friendly discussion regarding the results, architectural insights, and the underlying optimization
          strategies. This ensures a high-level technical exchange within a vetted peer group.
        </li>
        <li>
          <strong>RBAC Policy Enforcement</strong>: Role-Based Access Control must remain enabled and fully functional.
          Performance gains achieved by bypassing security layers are disqualified.
        </li>
        <li>
          <strong>Feature Parity</strong>: All core Kubernetes features, including Admission Controllers and standard API
          validation, must be active. No &ldquo;stripping&rdquo; of the environment is permitted.
        </li>
        <li>
          <strong>No Shortcuts</strong>: Any modification to the core that compromises data consistency will result in an
          invalid run.
        </li>
        <li>
          <strong>Zero Tolerance for Instability</strong>: Database or Kubernetes crash lead to immediate disqualification.
        </li>
        <li>
          <strong>Survive restart without helper scripts</strong>: The system has to survive a restart without any extra
          migration or preparing.
        </li>
      </ul>
      <blockquote>
        <strong>Integrity &amp; Honor</strong>: We are aware that benchmarks can be manipulated, and no amount of technical
        restriction can fully prevent dedicated cheating. However, this challenge is a matter of professional honor. We are
        not fools - any discrepancies will immediately surface during the discussion. Let&rsquo;s not ruin the collective
        experience for 15 minutes of fame; if you can&rsquo;t beat the baseline honestly, use the opportunity to learn how to
        improve.
      </blockquote>
      <ul>
        <li>Winners are responsible for any local taxes or customs duties related to their prizes.</li>
        <li>
          HariKube reserves the right to disqualify any submission that violates the spirit of the challenge. Our decision is
          final and non-negotiable.
        </li>
        <li>
          By submitting a PR, you consent to the public display of your GitHub username on the leaderboard. Personal
          information for prizes will be handled temporary and will not be shared with third parties.
        </li>
        <li>
          Legal Disclaimer: This is a skill-based challenge. Participation is free. By submitting your results, you
          acknowledge that the final validation of any score is subject to the Technical Discussion Protocol to ensure
          compliance with the rules.
        </li>
      </ul>

      <h2>Benchmark Details</h2>
      <ul>
        <li>The test execution is 1 hour</li>
        <li>Define concurrency on your own taste</li>
        <li>Each iteration creates 6 different type of custom resources in parallel</li>
        <li>Each iteration reads back the created custom resources via label selector in parallel</li>
      </ul>
      <p>
        Ready? <Link href="/submit/">How to submit</Link>
      </p>
    </div>
  );
}

import Link from "next/link";
import LeaderboardTable, { type Row } from "../components/LeaderboardTable";
import { getData, getRun } from "../lib/data";
import styles from "./page.module.css";

export default function HomePage() {
  const data = getData();
  const rows: Row[] = data.entries.map((e) => {
    const run = getRun(e.bestRunId)!;
    const m = run.metrics;
    return {
      rank: e.rank,
      participant: e.participant,
      github: e.github,
      score: e.score,
      checksTotal: m.checksTotal,
      successPct: m.checksSucceededPct,
      rps: m.httpReqsRate,
      med: m.httpReqDuration.med,
      p90: m.httpReqDuration.p90,
      p95: m.httpReqDuration.p95,
      specs: run.specs,
      date: run.date,
      runId: run.id,
      isBaseline: e.isBaseline,
    };
  });
  const onlyBaseline = data.entries.every((e) => e.isBaseline);

  return (
    <>
      <section className={`prose ${styles.intro}`}>
        <h1>Kubernetes Performance Challenge</h1>
        <p>
          Think your cluster is fast? Participants run a standardized k6 performance test against their own Kubernetes
          cluster to measure latency, throughput, and system stability. Each iteration creates six different types of custom
          resources in parallel and reads them back via label selector. The test runs for one hour.
        </p>
        <p>
          Participation is free and requires no purchase. Read the <Link href="/rules/">rules and scoring</Link>, then{" "}
          <Link href="/submit/">submit your run</Link>.
        </p>
        {data.baseline && (
          <p className={styles.toBeat}>
            Score to beat: <strong>{data.baseline.score}</strong> by{" "}
            <Link href={`/runs/${data.baseline.runId}/`}>{data.baseline.participant}</Link>
          </p>
        )}
      </section>

      <section aria-labelledby="leaderboard-heading">
        <h2 id="leaderboard-heading">Leaderboard</h2>
        <LeaderboardTable rows={rows} />
        {onlyBaseline && (
          <div className={`card ${styles.cta}`}>
            <h3>Be the first to submit</h3>
            <p>
              No one has challenged the baseline yet. Run the benchmark on your cluster, open a pull request with your results,
              and your score appears here once it is merged.
            </p>
            <Link className="button" href="/submit/">
              How to submit
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

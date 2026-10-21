import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "../../../components/Avatar";
import { getData, getEntry, getRun } from "../../../lib/data";
import { formatDateTime, formatInt, formatMs, formatPct, formatRate } from "../../../lib/format";
import { runPath } from "../../../lib/site";
import styles from "./run.module.css";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getData().runs.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const run = getRun((await params).id);
  if (!run) return {};
  const title = `${run.participant}: score ${run.score}`;
  const description = `Kubernetes Performance Challenge run by ${run.participant}: score ${run.score}, ${formatInt(run.metrics.checksTotal)} checks, ${formatPct(run.metrics.checksSucceededPct)} success, ${formatRate(run.metrics.httpReqsRate)}, p95 ${formatMs(run.metrics.httpReqDuration.p95)}.`;
  return {
    title,
    description,
    alternates: { canonical: runPath(run.id) },
    openGraph: { type: "article", title, description, url: runPath(run.id) },
    twitter: { card: "summary", title, description },
  };
}

export default async function RunPage({ params }: Props) {
  const run = getRun((await params).id);
  if (!run) notFound();
  const entry = getEntry(run.participant);
  const otherRuns = (entry?.runIds ?? []).filter((id) => id !== run.id).map((id) => getRun(id)!);
  const m = run.metrics;
  const d = m.httpReqDuration;
  const isBest = entry?.bestRunId === run.id;

  // Bars are scaled to p95; max is listed separately because it usually dwarfs the rest.
  const bars = [
    { label: "min", value: d.min },
    { label: "median", value: d.med },
    { label: "avg", value: d.avg },
    { label: "p90", value: d.p90 },
    { label: "p95", value: d.p95 },
  ];
  const scale = Math.max(...bars.map((b) => b.value), 1);

  return (
    <article>
      <p className={styles.back}>
        <Link href="/">← Leaderboard</Link>
      </p>

      <header className={styles.header}>
        <Avatar github={run.github} name={run.participant} size={56} />
        <div>
          <h1>
            {run.github ? <a href={`https://github.com/${run.github}`}>{run.participant}</a> : run.participant}
          </h1>
          <p className="muted">
            Run of <time dateTime={run.date}>{formatDateTime(run.date)}</time> · {run.vus} virtual users
          </p>
        </div>
        <div className={styles.score}>
          <span className={styles.scoreLabel}>Score</span>
          <span className={styles.scoreValue}>{run.score}</span>
          {run.isBaseline && <span className="badge">score to beat</span>}
        </div>
      </header>

      {entry && (
        <p>
          {isBest ? (
            <>
              Best run of {run.participant}, ranked <strong>#{entry.rank}</strong> of {getData().entries.length}.
            </>
          ) : (
            <>
              {run.participant} is ranked <strong>#{entry.rank}</strong> with their{" "}
              <Link href={runPath(entry.bestRunId)}>best run (score {entry.score})</Link>.
            </>
          )}
        </p>
      )}

      <section aria-labelledby="metrics">
        <h2 id="metrics">Metrics</h2>
        <dl className={styles.metrics}>
          <div>
            <dt>Checks total</dt>
            <dd>{formatInt(m.checksTotal)}</dd>
          </div>
          <div>
            <dt>Checks failed</dt>
            <dd>{formatInt(m.checksFailed)}</dd>
          </div>
          <div>
            <dt>Checks succeeded</dt>
            <dd>{formatPct(m.checksSucceededPct)}</dd>
          </div>
          <div>
            <dt>HTTP requests</dt>
            <dd>{m.httpReqsCount !== null ? formatInt(m.httpReqsCount) : "n/a"}</dd>
          </div>
          <div>
            <dt>Requests per second</dt>
            <dd>{m.httpReqsRate.toFixed(6)}/s</dd>
          </div>
          <div>
            <dt>HTTP requests failed</dt>
            <dd>{formatPct(m.httpReqFailedRate * 100)}</dd>
          </div>
          <div>
            <dt>Virtual users</dt>
            <dd>{run.vus}</dd>
          </div>
          <div>
            <dt>Specs</dt>
            <dd>{run.specs ?? <span className="muted">not provided</span>}</dd>
          </div>
        </dl>
        {run.notes && <blockquote>{run.notes}</blockquote>}
      </section>

      <section aria-labelledby="latency">
        <h2 id="latency">Latency (http_req_duration)</h2>
        <ul className={styles.bars}>
          {bars.map((b) => (
            <li key={b.label}>
              <span className={styles.barLabel}>{b.label}</span>
              <span className={styles.barTrack} aria-hidden="true">
                <span className={styles.bar} style={{ width: `${Math.max((b.value / scale) * 100, 0.5)}%` }} />
              </span>
              <span className={styles.barValue}>{formatMs(b.value)}</span>
            </li>
          ))}
        </ul>
        <p className="muted">
          max: {formatMs(d.max)}. The score uses median, p90 and p95 (weighted 0.2, 0.3, 0.5).{" "}
          <Link href="/rules/#score">How the score is calculated</Link>
        </p>
      </section>

      <section aria-labelledby="files">
        <h2 id="files">Files</h2>
        <ul>
          <li>
            Summary (used for scoring): <a href={run.summaryFile.url}>{run.summaryFile.path}</a>
          </li>
          {run.rawFiles.map((f) => (
            <li key={f.path}>
              Raw benchmark data: <a href={f.url}>{f.path}</a>
            </li>
          ))}
        </ul>
      </section>

      {otherRuns.length > 0 && (
        <section aria-labelledby="other-runs">
          <h2 id="other-runs">Other runs by {run.participant}</h2>
          <ul>
            {otherRuns.map((r) => (
              <li key={r.id}>
                <Link href={runPath(r.id)}>
                  Score {r.score} · {formatDateTime(r.date)} · {r.vus} VUs
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

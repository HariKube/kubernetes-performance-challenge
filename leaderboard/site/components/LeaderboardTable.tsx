"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { formatDate, formatInt, formatMs, formatPct, formatRate } from "../lib/format";
import { runPath } from "../lib/site";
import Avatar from "./Avatar";
import styles from "./LeaderboardTable.module.css";

export interface Row {
  rank: number;
  participant: string;
  github: string | null;
  score: number;
  checksTotal: number;
  successPct: number;
  rps: number;
  med: number;
  p90: number;
  p95: number;
  specs: string | null;
  date: string;
  runId: string;
  isBaseline: boolean;
}

type Key = keyof Pick<Row, "rank" | "participant" | "score" | "checksTotal" | "successPct" | "rps" | "med" | "p90" | "p95" | "specs" | "date">;
type Dir = "asc" | "desc";

const COLUMNS: { key: Key; label: string; numeric: boolean; firstDir: Dir }[] = [
  { key: "rank", label: "Rank", numeric: true, firstDir: "asc" },
  { key: "participant", label: "Participant", numeric: false, firstDir: "asc" },
  { key: "score", label: "Score", numeric: true, firstDir: "desc" },
  { key: "checksTotal", label: "Checks total", numeric: true, firstDir: "desc" },
  { key: "successPct", label: "Success", numeric: true, firstDir: "desc" },
  { key: "rps", label: "Req/s", numeric: true, firstDir: "desc" },
  { key: "med", label: "Median", numeric: true, firstDir: "asc" },
  { key: "p90", label: "p90", numeric: true, firstDir: "asc" },
  { key: "p95", label: "p95", numeric: true, firstDir: "asc" },
  { key: "specs", label: "Specs", numeric: false, firstDir: "asc" },
  { key: "date", label: "Date", numeric: false, firstDir: "desc" },
];

function compare(a: Row, b: Row, key: Key): number {
  const x = a[key];
  const y = b[key];
  if (x === null) return y === null ? 0 : 1;
  if (y === null) return -1;
  return typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
}

export default function LeaderboardTable({ rows }: { rows: Row[] }) {
  const [sort, setSort] = useState<{ key: Key; dir: Dir }>({ key: "rank", dir: "asc" });
  const [query, setQuery] = useState("");
  const filterId = useId();
  const captionId = useId();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => [r.participant, r.github ?? "", r.specs ?? ""].some((v) => v.toLowerCase().includes(q)))
      : rows;
    const sign = sort.dir === "asc" ? 1 : -1;
    // Nulls ("not provided") always last; rank breaks ties.
    return [...filtered].sort((a, b) => {
      const nullA = a[sort.key] === null;
      const nullB = b[sort.key] === null;
      if (nullA !== nullB) return nullA ? 1 : -1;
      return sign * compare(a, b, sort.key) || a.rank - b.rank;
    });
  }, [rows, query, sort]);

  const toggle = (key: Key, firstDir: Dir) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: firstDir }));

  return (
    <div>
      <div className={styles.toolbar}>
        <label htmlFor={filterId}>Filter</label>
        <input
          id={filterId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Participant or specs"
          autoComplete="off"
        />
        <span className={styles.count} aria-live="polite">
          {visible.length === rows.length ? `${rows.length} participant${rows.length === 1 ? "" : "s"}` : `${visible.length} of ${rows.length} shown`}
        </span>
      </div>
      <p className={styles.scrollHint}>Scroll sideways to see all columns.</p>
      <div className={styles.scroll} role="region" aria-labelledby={captionId} tabIndex={0}>
        <table className={styles.table}>
          <caption id={captionId} className={styles.caption}>
            Leaderboard, best run per participant. Select a column header to sort.
          </caption>
          <thead>
            <tr>
              {COLUMNS.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={c.numeric ? styles.num : undefined}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <button type="button" className={styles.sortButton} onClick={() => toggle(c.key, c.firstDir)}>
                      {c.label}
                      <span className={styles.sortIcon} aria-hidden="true">
                        {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.runId} className={r.isBaseline ? styles.baseline : undefined}>
                <td className={styles.num}>{r.rank}</td>
                <th scope="row" className={styles.participant}>
                  <span className={styles.who}>
                    <Avatar github={r.github} name={r.participant} />
                    {r.github ? <a href={`https://github.com/${r.github}`}>{r.participant}</a> : <span>{r.participant}</span>}
                  </span>
                  {r.isBaseline && <span className="badge">score to beat</span>}
                </th>
                <td className={`${styles.num} ${styles.score}`}>
                  <Link href={runPath(r.runId)} aria-label={`Score ${r.score}: view run details for ${r.participant}`}>
                    {r.score}
                  </Link>
                </td>
                <td className={styles.num}>{formatInt(r.checksTotal)}</td>
                <td className={styles.num}>{formatPct(r.successPct)}</td>
                <td className={styles.num}>{formatRate(r.rps)}</td>
                <td className={styles.num}>{formatMs(r.med)}</td>
                <td className={styles.num}>{formatMs(r.p90)}</td>
                <td className={styles.num}>{formatMs(r.p95)}</td>
                <td className={styles.specs}>{r.specs ?? <span className="muted">not provided</span>}</td>
                <td className={styles.date}>
                  <time dateTime={r.date}>{formatDate(r.date)}</time>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className={styles.empty}>
                  No participants match “{query}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

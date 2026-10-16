// Fixed locale so server-rendered HTML and client re-renders always match.
const intFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const trim = (v: number, digits = 2) => String(Number(v.toFixed(digits)));

export const formatInt = (v: number) => intFormat.format(v);

/** Milliseconds: "71.06 ms", "3.71 s". */
export const formatMs = (v: number) => (v >= 1000 ? `${trim(v / 1000)} s` : `${trim(v)} ms`);

export const formatPct = (v: number) => `${v.toFixed(2)}%`;

export const formatRate = (v: number) => `${trim(v, 2)}/s`;

/** "2026-02-24" (UTC). */
export const formatDate = (iso: string) => iso.slice(0, 10);

/** "2026-02-24 13:59 UTC" */
export const formatDateTime = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

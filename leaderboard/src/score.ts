/**
 * Score formula (http_req_duration in ms):
 *
 *   floor( checks_total / (med*0.2 + p90*0.3 + p95*0.5) * pow(1 - checks_failed/checks_total, 7) )
 */

export const LATENCY_WEIGHTS = { med: 0.2, p90: 0.3, p95: 0.5 } as const;
export const SUCCESS_EXPONENT = 7;

export interface ScoreInput {
  checksTotal: number;
  checksFailed: number;
  med: number;
  p90: number;
  p95: number;
}

export type ScoreResult =
  | {
      valid: true;
      score: number;
      /** Unfloored value. */
      raw: number;
      /** med*0.2 + p90*0.3 + p95*0.5 */
      latencyDenominator: number;
      /** pow(1 - checks_failed/checks_total, 7) */
      successFactor: number;
    }
  | { valid: false; reason: string };

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Computes the score. Never returns NaN or Infinity: bad input yields { valid: false }. */
export function computeScore(input: Partial<ScoreInput> | null | undefined): ScoreResult {
  if (!input) return { valid: false, reason: "no input" };
  const { checksTotal, checksFailed, med, p90, p95 } = input;

  for (const [name, value] of Object.entries({ checksTotal, checksFailed, med, p90, p95 })) {
    if (!isFiniteNumber(value)) return { valid: false, reason: `${name} is missing or not a finite number` };
    if (value < 0) return { valid: false, reason: `${name} must not be negative` };
  }
  // Narrowed by the loop above.
  const total = checksTotal as number;
  const failed = checksFailed as number;

  if (total === 0) return { valid: false, reason: "checksTotal is 0" };
  if (failed > total) return { valid: false, reason: "checksFailed is greater than checksTotal" };

  const latencyDenominator =
    (med as number) * LATENCY_WEIGHTS.med + (p90 as number) * LATENCY_WEIGHTS.p90 + (p95 as number) * LATENCY_WEIGHTS.p95;
  if (!(latencyDenominator > 0)) return { valid: false, reason: "latency denominator is 0" };

  const successFactor = Math.pow(1 - failed / total, SUCCESS_EXPONENT);
  const raw = (total / latencyDenominator) * successFactor;
  if (!Number.isFinite(raw)) return { valid: false, reason: "score is not finite" };

  return { valid: true, score: Math.floor(raw), raw, latencyDenominator, successFactor };
}

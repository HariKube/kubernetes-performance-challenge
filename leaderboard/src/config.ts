import { readFileSync } from "node:fs";
import { z } from "zod";

/** leaderboard/config.json */
export const configSchema = z.object({
  /** results/<folder> whose best run is the "score to beat". */
  baselineParticipant: z.string().min(1),
});

export type LeaderboardConfig = z.infer<typeof configSchema>;

export function parseConfig(json: unknown): LeaderboardConfig {
  const parsed = configSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Invalid leaderboard config: ${parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ")}`);
  }
  return parsed.data;
}

export function loadConfig(file: string): LeaderboardConfig {
  return parseConfig(JSON.parse(readFileSync(file, "utf8")));
}

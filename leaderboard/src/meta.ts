import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

/** Optional results/<participant>/meta.json */
export const metaSchema = z.object({
  github: z.string().optional(),
  specs: z.string().optional(),
  notes: z.string().optional(),
});

export type Meta = z.infer<typeof metaSchema>;

// GitHub usernames: alphanumeric or single hyphens, max 39 chars, no leading/trailing hyphen.
const GITHUB_USERNAME = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

export function isValidGithubUsername(name: string): boolean {
  return GITHUB_USERNAME.test(name);
}

export interface MetaResult {
  meta: Meta;
  warnings: string[];
}

/** Reads meta.json from a participant folder. Problems are reported as warnings; the file is then ignored. */
export function loadMeta(participantDir: string, displayDir: string): MetaResult {
  const file = join(participantDir, "meta.json");
  if (!existsSync(file)) return { meta: {}, warnings: [] };
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    return { meta: {}, warnings: [`${displayDir}/meta.json is not valid JSON and was ignored: ${(e as Error).message}`] };
  }
  const parsed = metaSchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    return { meta: {}, warnings: [`${displayDir}/meta.json was ignored: ${issues}`] };
  }
  return { meta: parsed.data, warnings: [] };
}

/**
 * GitHub username for avatar/profile: meta.github if valid, else the folder name
 * if it is a valid username, else null.
 */
export function resolveGithub(folder: string, meta: Meta): { github: string | null; warning: string | null } {
  if (meta.github !== undefined) {
    if (isValidGithubUsername(meta.github)) return { github: meta.github, warning: null };
    return {
      github: null,
      warning: `meta.json "github" value for "${folder}" is not a valid GitHub username, so no avatar or profile link is shown.`,
    };
  }
  if (isValidGithubUsername(folder)) return { github: folder, warning: null };
  return {
    github: null,
    warning: `Folder name "${folder}" is not a valid GitHub username. Add results/${folder}/meta.json with { "github": "<your-username>" } to show your avatar and profile link.`,
  };
}

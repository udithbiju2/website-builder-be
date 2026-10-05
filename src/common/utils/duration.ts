const MULTIPLIERS_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Parses durations like "15m", "7d" (same format as JWT expiresIn). */
export function parseDurationMs(raw: string): number {
  const match = /^(\d+)([smhd])$/.exec(raw.trim());
  if (!match) {
    throw new Error(`Invalid duration "${raw}". Use a number followed by s, m, h or d (e.g. 15m).`);
  }
  return Number(match[1]) * MULTIPLIERS_MS[match[2]];
}

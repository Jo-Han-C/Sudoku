import { DIFFICULTIES, type Difficulty } from '../engine/difficulty';

export interface DifficultyStats {
  started: number;
  won: number;
  lost: number;
  givenUp: number;
  wonNoMistakes: number;
  bestTimeMs: number | null;
  totalWonTimeMs: number;
  currentStreak: number;
  bestStreak: number;
}

export interface Stats {
  v: 1;
  byDifficulty: Record<Difficulty, DifficultyStats>;
}

export const emptyDifficultyStats = (): DifficultyStats => ({
  started: 0,
  won: 0,
  lost: 0,
  givenUp: 0,
  wonNoMistakes: 0,
  bestTimeMs: null,
  totalWonTimeMs: 0,
  currentStreak: 0,
  bestStreak: 0,
});

export const emptyStats = (): Stats => ({
  v: 1,
  byDifficulty: Object.fromEntries(DIFFICULTIES.map((d) => [d, emptyDifficultyStats()])) as Record<
    Difficulty,
    DifficultyStats
  >,
});

function update(stats: Stats, d: Difficulty, fn: (s: DifficultyStats) => DifficultyStats): Stats {
  return { ...stats, byDifficulty: { ...stats.byDifficulty, [d]: fn(stats.byDifficulty[d]) } };
}

/** Anropas vid första draget i ett spel. */
export const recordStart = (stats: Stats, d: Difficulty): Stats =>
  update(stats, d, (s) => ({ ...s, started: s.started + 1 }));

export const recordWin = (stats: Stats, d: Difficulty, timeMs: number, mistakes: number): Stats =>
  update(stats, d, (s) => {
    const currentStreak = s.currentStreak + 1;
    return {
      ...s,
      won: s.won + 1,
      wonNoMistakes: s.wonNoMistakes + (mistakes === 0 ? 1 : 0),
      bestTimeMs: s.bestTimeMs === null ? timeMs : Math.min(s.bestTimeMs, timeMs),
      totalWonTimeMs: s.totalWonTimeMs + timeMs,
      currentStreak,
      bestStreak: Math.max(s.bestStreak, currentStreak),
    };
  });

/** Förlust efter tre misstag, eller uppgivet spel. Nollställer vinstraden. */
export const recordLoss = (stats: Stats, d: Difficulty, givenUp: boolean): Stats =>
  update(stats, d, (s) => ({
    ...s,
    lost: s.lost + 1,
    givenUp: s.givenUp + (givenUp ? 1 : 0),
    currentStreak: 0,
  }));

export const winRate = (s: DifficultyStats): number | null =>
  s.started > 0 ? s.won / s.started : null;

export const averageTimeMs = (s: DifficultyStats): number | null =>
  s.won > 0 ? s.totalWonTimeMs / s.won : null;

/** Summerar alla nivåer. Vinstrader summeras inte utan visar det högsta värdet. */
export function totals(stats: Stats): DifficultyStats {
  const all = DIFFICULTIES.map((d) => stats.byDifficulty[d]);
  const bests = all.map((s) => s.bestTimeMs).filter((t): t is number => t !== null);
  return {
    started: all.reduce((n, s) => n + s.started, 0),
    won: all.reduce((n, s) => n + s.won, 0),
    lost: all.reduce((n, s) => n + s.lost, 0),
    givenUp: all.reduce((n, s) => n + s.givenUp, 0),
    wonNoMistakes: all.reduce((n, s) => n + s.wonNoMistakes, 0),
    bestTimeMs: bests.length ? Math.min(...bests) : null,
    totalWonTimeMs: all.reduce((n, s) => n + s.totalWonTimeMs, 0),
    currentStreak: Math.max(...all.map((s) => s.currentStreak)),
    bestStreak: Math.max(...all.map((s) => s.bestStreak)),
  };
}

/** Läser in sparad statistik och fyller i det som saknas. */
export function normalizeStats(raw: unknown): Stats {
  const out = emptyStats();
  const by = (raw as { byDifficulty?: Record<string, unknown> } | null)?.byDifficulty;
  if (!by || typeof by !== 'object') return out;
  for (const d of DIFFICULTIES) {
    const src = by[d] as Record<string, unknown> | undefined;
    if (!src || typeof src !== 'object') continue;
    const s = out.byDifficulty[d];
    for (const key of Object.keys(s) as (keyof DifficultyStats)[]) {
      const v = src[key];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) (s[key] as number) = v;
    }
  }
  return out;
}

import type { Level } from './grader';

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert', 'master'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Lätt',
  medium: 'Medel',
  hard: 'Svår',
  expert: 'Expert',
  master: 'Mästare',
};

export interface DifficultySpec {
  /** Svåraste tekniknivå som pusslet måste kräva, som ett intervall. */
  minLevel: Level;
  maxLevel: Level;
  /** Tillåtet antal ledtrådar. */
  clues: readonly [number, number];
}

/**
 * Tekniknivåer (se grader.ts):
 * 1 singles · 2 pointing/claiming/par · 3 trippelgrupper ·
 * 4 X-wing/Swordfish/XY-wing · 5 kvadrupler/Jellyfish/XYZ-wing/färgning.
 * Lätt och Medel kräver bara singles; Medel har färre ledtrådar och blir därför svårare att hitta.
 */
export const DIFFICULTY_SPEC: Record<Difficulty, DifficultySpec> = {
  easy: { minLevel: 1, maxLevel: 1, clues: [36, 45] },
  medium: { minLevel: 1, maxLevel: 1, clues: [27, 34] },
  hard: { minLevel: 2, maxLevel: 3, clues: [24, 32] },
  expert: { minLevel: 4, maxLevel: 4, clues: [22, 30] },
  master: { minLevel: 5, maxLevel: 5, clues: [21, 30] },
};

export const isDifficulty = (v: unknown): v is Difficulty =>
  typeof v === 'string' && (DIFFICULTIES as readonly string[]).includes(v);

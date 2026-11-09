import { parseGrid, serializeGrid } from '../engine/board';
import type { Difficulty } from '../engine/difficulty';
import { mulberry32, randInt, randomSeed, type Rng } from '../engine/rng';
import { solve } from '../engine/solver';
import { applyTransform, randomTransform } from '../engine/transform';

/** Varje nivå laddas först när den behövs och läggs sedan i cache. */
const LOADERS: Record<Difficulty, () => Promise<string>> = {
  easy: () => import('../data/easy.txt?raw').then((m) => m.default),
  medium: () => import('../data/medium.txt?raw').then((m) => m.default),
  hard: () => import('../data/hard.txt?raw').then((m) => m.default),
  expert: () => import('../data/expert.txt?raw').then((m) => m.default),
  master: () => import('../data/master.txt?raw').then((m) => m.default),
};

const cache = new Map<Difficulty, string[]>();

export const parseBank = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export async function loadBank(difficulty: Difficulty): Promise<string[]> {
  let bank = cache.get(difficulty);
  if (!bank) {
    bank = parseBank(await LOADERS[difficulty]());
    cache.set(difficulty, bank);
  }
  return bank;
}

export interface NewPuzzle {
  difficulty: Difficulty;
  /** Pusslets plats i banken, t.ex. "expert-17". */
  puzzleId: string;
  bankIndex: number;
  /** 81 tecken, 0 = tom cell. */
  givens: string;
  solution: string;
}

/** Hur många nyligen spelade pussel per nivå som undviks. */
export const RECENT_LIMIT = 100;

/** Lägger till ett index först i listan över nyligen spelade och kortar listan. */
export const pushRecent = (recent: readonly number[], index: number): number[] =>
  [index, ...recent.filter((i) => i !== index)].slice(0, RECENT_LIMIT);

/**
 * Väljer ett pussel som inte spelats nyligen och blandar om det med en
 * slumpad transformation, så att samma pussel inte går att känna igen.
 */
export function pickFromBank(
  bank: readonly string[],
  difficulty: Difficulty,
  rng: Rng,
  recent: readonly number[] = [],
): NewPuzzle {
  if (bank.length === 0) throw new Error(`Pusselbanken för ${difficulty} är tom`);
  const avoid = new Set(recent);
  let options = bank.map((_, i) => i).filter((i) => !avoid.has(i));
  if (options.length === 0) options = bank.map((_, i) => i);
  const bankIndex = options[randInt(rng, options.length)]!;

  const givens = applyTransform(parseGrid(bank[bankIndex]!), randomTransform(rng));
  const solution = solve(givens);
  if (!solution) throw new Error(`Pussel ${difficulty}-${bankIndex} saknar lösning`);

  return {
    difficulty,
    puzzleId: `${difficulty}-${bankIndex}`,
    bankIndex,
    givens: serializeGrid(givens),
    solution: serializeGrid(solution),
  };
}

export async function newPuzzle(
  difficulty: Difficulty,
  options: { rng?: Rng; recent?: readonly number[] } = {},
): Promise<NewPuzzle> {
  const bank = await loadBank(difficulty);
  return pickFromBank(bank, difficulty, options.rng ?? mulberry32(randomSeed()), options.recent);
}

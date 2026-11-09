import { CELLS } from '../engine/board';
import { DIFFICULTIES, isDifficulty, type Difficulty } from '../engine/difficulty';
import { elapsedAt } from '../game/selectors';
import { normalizeSettings, type Settings } from '../game/settings';
import type { GameState } from '../game/types';
import { normalizeStats, type Stats } from '../stats/stats';

/** Det vi behöver av localStorage, så att tester kan använda en egen implementation. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const KEYS = {
  game: 'sudoku:v1:game',
  stats: 'sudoku:v1:stats',
  settings: 'sudoku:v1:settings',
  recent: 'sudoku:v1:recent',
} as const;

export function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

/** localStorage om det fungerar, annars ett minne som bara lever så länge sidan är öppen. */
export function browserStore(): KeyValueStore {
  try {
    const ls = window.localStorage;
    const probe = '__sudoku_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return memoryStore();
  }
}

function readJson(kv: KeyValueStore, key: string): unknown {
  try {
    const raw = kv.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(kv: KeyValueStore, key: string, value: unknown): void {
  try {
    kv.setItem(key, JSON.stringify(value));
  } catch {
    // Fullt eller blockerat lagringsutrymme: spelet fortsätter utan att spara.
  }
}

const isDigitArray = (v: unknown, max: number): v is number[] =>
  Array.isArray(v) &&
  v.length === CELLS &&
  v.every((n) => Number.isInteger(n) && n >= 0 && n <= max);

function isGameState(v: unknown): v is GameState {
  if (!v || typeof v !== 'object') return false;
  const g = v as Partial<GameState>;
  return (
    g.v === 1 &&
    typeof g.id === 'string' &&
    isDifficulty(g.difficulty) &&
    typeof g.givens === 'string' &&
    /^[0-9]{81}$/.test(g.givens) &&
    typeof g.solution === 'string' &&
    /^[1-9]{81}$/.test(g.solution) &&
    isDigitArray(g.values, 9) &&
    isDigitArray(g.notes, 0x1ff) &&
    Array.isArray(g.history) &&
    typeof g.mistakes === 'number' &&
    typeof g.elapsedMs === 'number' &&
    ['playing', 'paused', 'won', 'lost'].includes(g.status as string)
  );
}

/** Sparat spel. Ett spel som pågick när appen stängdes öppnas pausat. */
export function loadGame(kv: KeyValueStore): GameState | null {
  const g = readJson(kv, KEYS.game);
  if (!isGameState(g)) return null;
  const status = g.status === 'playing' ? 'paused' : g.status;
  return { ...g, status, runningSince: null, selected: g.selected ?? null };
}

/** Sparar med speltiden fram till `now`, så att tid när appen är stängd aldrig räknas. */
export function saveGame(kv: KeyValueStore, g: GameState, now: number): void {
  writeJson(kv, KEYS.game, { ...g, elapsedMs: elapsedAt(g, now), runningSince: null });
}

export const clearGame = (kv: KeyValueStore): void => {
  try {
    kv.removeItem(KEYS.game);
  } catch {
    // ignorera
  }
};

export const loadStats = (kv: KeyValueStore): Stats => normalizeStats(readJson(kv, KEYS.stats));
export const saveStats = (kv: KeyValueStore, s: Stats): void => writeJson(kv, KEYS.stats, s);

export const loadSettings = (kv: KeyValueStore): Settings =>
  normalizeSettings(readJson(kv, KEYS.settings));
export const saveSettings = (kv: KeyValueStore, s: Settings): void =>
  writeJson(kv, KEYS.settings, s);

export type Recent = Record<Difficulty, number[]>;

export function loadRecent(kv: KeyValueStore): Recent {
  const raw = readJson(kv, KEYS.recent) as Record<string, unknown> | null;
  const out = Object.fromEntries(DIFFICULTIES.map((d) => [d, [] as number[]])) as Recent;
  for (const d of DIFFICULTIES) {
    const list = raw?.[d];
    if (Array.isArray(list)) out[d] = list.filter((n): n is number => Number.isInteger(n));
  }
  return out;
}

export const saveRecent = (kv: KeyValueStore, r: Recent): void => writeJson(kv, KEYS.recent, r);

import { UNITS, bit } from '../engine/board';
import { grade } from '../engine/grader';
import type { GameState } from './types';

export const solutionAt = (g: GameState, i: number): number => g.solution.charCodeAt(i) - 48;
export const isGiven = (g: GameState, i: number): boolean => g.givens[i] !== '0';
export const isWrong = (g: GameState, i: number): boolean =>
  g.values[i] !== 0 && g.values[i] !== solutionAt(g, i);
/** Givna och korrekt ifyllda celler går inte att ändra (bara ångra). */
export const isLocked = (g: GameState, i: number): boolean =>
  g.values[i] !== 0 && g.values[i] === solutionAt(g, i);

export const hasNote = (g: GameState, i: number, d: number): boolean =>
  (g.notes[i]! & bit(d)) !== 0;

/** Ackumulerad speltid vid tidpunkten `now`. */
export const elapsedAt = (g: GameState, now: number): number =>
  g.elapsedMs + (g.runningSince !== null ? Math.max(0, now - g.runningSince) : 0);

/** Antal korrekt ifyllda celler av de som var tomma från början, t.ex. 39/59. */
export function progress(g: GameState): { filled: number; total: number } {
  let filled = 0;
  let total = 0;
  for (let i = 0; i < 81; i++) {
    if (isGiven(g, i)) continue;
    total++;
    if (isLocked(g, i)) filled++;
  }
  return { filled, total };
}

/** remaining[d] = hur många av siffran d som återstår att placera korrekt. */
export function remainingDigits(g: GameState): number[] {
  const remaining = [0, 9, 9, 9, 9, 9, 9, 9, 9, 9];
  for (let i = 0; i < 81; i++) if (isLocked(g, i)) remaining[g.values[i]!]!--;
  return remaining;
}

export const isComplete = (g: GameState): boolean =>
  g.values.every((v, i) => v === solutionAt(g, i));

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Autofyll erbjuds först när högst så här många celler är tomma. */
export const AUTO_COMPLETE_MAX_EMPTY = 10;

/**
 * Sant när pusslet nästan är klart: högst AUTO_COMPLETE_MAX_EMPTY tomma celler,
 * inga fel siffror, och resten går att lösa med bara singles (ensamma och gömda).
 */
export function canAutoComplete(g: GameState): boolean {
  if (g.status !== 'playing') return false;
  let empty = 0;
  for (let i = 0; i < 81; i++) {
    if (isWrong(g, i)) return false;
    if (g.values[i] === 0) empty++;
  }
  if (empty === 0 || empty > AUTO_COMPLETE_MAX_EMPTY) return false;
  return grade(g.values, 1).solved;
}

/** Celler i de rader, kolumner och boxar genom `cell` som är helt och korrekt ifyllda. */
export function completedUnitCells(g: GameState, cell: number): number[] {
  const out = new Set<number>();
  for (const unit of UNITS) {
    if (!unit.includes(cell)) continue;
    if (unit.every((i) => isLocked(g, i))) for (const i of unit) out.add(i);
  }
  return [...out];
}

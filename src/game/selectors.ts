import { ALL_DIGITS, PEERS, bit, popcount } from '../engine/board';
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

/**
 * Sant när varje tom cell bara har en möjlig siffra och inga fel siffror finns på brädet.
 * Då kan resten fyllas i automatiskt (inställningen Autokomplettering).
 */
export function canAutoComplete(g: GameState): boolean {
  if (g.status !== 'playing') return false;
  let empty = 0;
  for (let i = 0; i < 81; i++) {
    if (isWrong(g, i)) return false;
    if (g.values[i] !== 0) continue;
    empty++;
    let used = 0;
    for (const p of PEERS[i]!) if (g.values[p]) used |= bit(g.values[p]!);
    if (popcount(ALL_DIGITS & ~used) !== 1) return false;
  }
  return empty > 0;
}

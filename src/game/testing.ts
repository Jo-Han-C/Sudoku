import { parseGrid, serializeGrid } from '../engine/board';
import { solve } from '../engine/solver';
import type { NewPuzzle } from '../puzzles/bank';

/** Ett känt lätt pussel (Project Euler 96, nr 1) för tester. */
export const TEST_GIVENS =
  '003020600900305001001806400008102900700000008006708200002609500800203009005010300';

export const testPuzzle = (givens = TEST_GIVENS): NewPuzzle => ({
  difficulty: 'easy',
  puzzleId: 'easy-0',
  bankIndex: 0,
  givens,
  solution: serializeGrid(solve(parseGrid(givens))!),
});

/** Samma pussel men med alla celler utom `keepEmpty` ifyllda. */
export function nearlySolved(keepEmpty: number[]): NewPuzzle {
  const p = testPuzzle();
  const givens = Array.from(p.solution, (ch, i) => (keepEmpty.includes(i) ? '0' : ch)).join('');
  return { ...p, givens };
}

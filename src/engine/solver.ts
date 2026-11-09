import { ALL_DIGITS, CELLS, boxOf, colOf, rowOf, type Grid } from './board';
import { shuffled, type Rng } from './rng';

/**
 * Backtracking-lösare med bitmasker och "minst antal kandidater först".
 * Används för unikhetskontroll och för att ta fram lösningen till ett pussel.
 */

interface SearchState {
  grid: Grid;
  rows: number[];
  cols: number[];
  boxes: number[];
}

function initState(puzzle: Grid): SearchState | null {
  const rows = new Array<number>(9).fill(0);
  const cols = new Array<number>(9).fill(0);
  const boxes = new Array<number>(9).fill(0);
  const grid = puzzle.slice();
  for (let i = 0; i < CELLS; i++) {
    const v = grid[i]!;
    if (!v) continue;
    const m = 1 << (v - 1);
    const r = rowOf(i);
    const c = colOf(i);
    const b = boxOf(i);
    if ((rows[r]! | cols[c]! | boxes[b]!) & m) return null;
    rows[r]! |= m;
    cols[c]! |= m;
    boxes[b]! |= m;
  }
  return { grid, rows, cols, boxes };
}

/** Väljer den tomma cell som har minst kandidater. -1 om allt är ifyllt. */
function pickCell(s: SearchState): { cell: number; mask: number } {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < CELLS; i++) {
    if (s.grid[i]) continue;
    const mask = ALL_DIGITS & ~(s.rows[rowOf(i)]! | s.cols[colOf(i)]! | s.boxes[boxOf(i)]!);
    let n = 0;
    for (let m = mask; m; m &= m - 1) n++;
    if (n < bestCount) {
      best = i;
      bestMask = mask;
      bestCount = n;
      if (n <= 1) break;
    }
  }
  return { cell: best, mask: bestMask };
}

function search(s: SearchState, limit: number, onSolution: (g: Grid) => void, rng?: Rng): number {
  const { cell, mask } = pickCell(s);
  if (cell === -1) {
    onSolution(s.grid);
    return 1;
  }
  if (!mask) return 0;
  const r = rowOf(cell);
  const c = colOf(cell);
  const b = boxOf(cell);
  let digits: number[] = [];
  for (let d = 1; d <= 9; d++) if (mask & (1 << (d - 1))) digits.push(d);
  if (rng) digits = shuffled(digits, rng);
  let found = 0;
  for (const d of digits) {
    const m = 1 << (d - 1);
    s.grid[cell] = d;
    s.rows[r]! |= m;
    s.cols[c]! |= m;
    s.boxes[b]! |= m;
    found += search(s, limit - found, onSolution, rng);
    s.grid[cell] = 0;
    s.rows[r]! &= ~m;
    s.cols[c]! &= ~m;
    s.boxes[b]! &= ~m;
    if (found >= limit) break;
  }
  return found;
}

/** Räknar lösningar, men slutar vid `limit` (standard 2, vilket räcker för unikhetskontroll). */
export function countSolutions(puzzle: Grid, limit = 2): number {
  const s = initState(puzzle);
  if (!s) return 0;
  return search(s, limit, () => {});
}

/** Första lösningen som hittas, eller null om pusslet saknar lösning. */
export function solve(puzzle: Grid): Grid | null {
  const s = initState(puzzle);
  if (!s) return null;
  let result: Grid | null = null;
  search(s, 1, (g) => {
    result = g.slice();
  });
  return result;
}

export const hasUniqueSolution = (puzzle: Grid): boolean => countSolutions(puzzle, 2) === 1;

/** Ett slumpat, komplett och giltigt rutnät. */
export function randomSolution(rng: Rng): Grid {
  const s = initState(new Array<number>(CELLS).fill(0))!;
  let result: Grid | null = null;
  search(
    s,
    1,
    (g) => {
      result = g.slice();
    },
    rng,
  );
  return result!;
}

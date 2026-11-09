import { CELLS, type Grid } from './board';
import { shuffled, type Rng } from './rng';

/**
 * Slumpade transformationer som ger ett pussel med samma logiska svårighet:
 * byta siffror, byta rader inom ett band, byta band, byta kolumner inom en
 * stack, byta stackar och spegla längs diagonalen.
 */
export interface Transform {
  digits: number[]; // digits[d] = ny siffra för d (index 0 oanvänt)
  rows: number[]; // rows[r] = gammal rad för ny rad r
  cols: number[]; // cols[c] = gammal kolumn för ny kolumn c
  transpose: boolean;
}

function lineOrder(rng: Rng): number[] {
  return shuffled([0, 1, 2], rng).flatMap((band) =>
    shuffled([0, 1, 2], rng).map((k) => band * 3 + k),
  );
}

export function randomTransform(rng: Rng): Transform {
  return {
    digits: [0, ...shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)],
    rows: lineOrder(rng),
    cols: lineOrder(rng),
    transpose: rng() < 0.5,
  };
}

export function applyTransform(grid: Grid, t: Transform): Grid {
  const out = new Array<number>(CELLS);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const [sr, sc] = t.transpose ? [c, r] : [r, c];
      const v = grid[t.rows[sr]! * 9 + t.cols[sc]!]!;
      out[r * 9 + c] = v ? t.digits[v]! : 0;
    }
  }
  return out;
}

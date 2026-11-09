import { CELLS, type Grid } from './board';
import { DIFFICULTY_SPEC, type Difficulty } from './difficulty';
import { grade } from './grader';
import { randInt, shuffled, type Rng } from './rng';
import { hasUniqueSolution, randomSolution } from './solver';

export interface GeneratedPuzzle {
  puzzle: Grid;
  solution: Grid;
}

/** Cellpar som är 180°-symmetriska, plus mittcellen ensam. */
const SYMMETRIC_PAIRS: readonly (readonly number[])[] = Array.from({ length: 41 }, (_, i) =>
  i === 40 ? [40] : [i, CELLS - 1 - i],
);

/**
 * Ett försök att skapa ett pussel på given nivå.
 * Ledtrådar tas bort symmetriskt så länge lösningen är unik och pusslet
 * fortfarande går att lösa med teknikerna för nivån. Returnerar null om
 * resultatet inte hamnade på exakt rätt nivå.
 */
export function tryGenerate(difficulty: Difficulty, rng: Rng): GeneratedPuzzle | null {
  const { minLevel, maxLevel, clues } = DIFFICULTY_SPEC[difficulty];
  const [minClues, maxClues] = clues;
  // Nivåer som bara kräver singles stannar på ett slumpat antal ledtrådar,
  // svårare nivåer tar bort så många som möjligt.
  const stopAt = maxLevel === 1 ? minClues + randInt(rng, maxClues - minClues + 1) : minClues;

  const solution = randomSolution(rng);
  const puzzle = solution.slice();
  let givens = CELLS;

  for (const cells of shuffled(SYMMETRIC_PAIRS, rng)) {
    if (givens - cells.length < stopAt) continue;
    const saved = cells.map((i) => puzzle[i]!);
    for (const i of cells) puzzle[i] = 0;
    if (hasUniqueSolution(puzzle) && grade(puzzle, maxLevel).solved) {
      givens -= cells.length;
    } else {
      cells.forEach((i, k) => (puzzle[i] = saved[k]!));
    }
  }

  if (givens < minClues || givens > maxClues) return null;
  const { solved, level } = grade(puzzle, 5);
  if (!solved || level < minLevel || level > maxLevel) return null;
  return { puzzle, solution };
}

/** Försöker tills ett pussel på rätt nivå hittas (eller maxAttempts nås). */
export function generate(difficulty: Difficulty, rng: Rng, maxAttempts = 10_000): GeneratedPuzzle {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const p = tryGenerate(difficulty, rng);
    if (p) return p;
  }
  throw new Error(`Kunde inte generera ett pussel på nivån ${difficulty}`);
}

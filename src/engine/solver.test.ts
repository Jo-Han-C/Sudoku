import { describe, expect, it } from 'vitest';
import { CELLS, isSolvedGrid, parseGrid } from './board';
import { mulberry32 } from './rng';
import { countSolutions, hasUniqueSolution, randomSolution, solve } from './solver';

// Project Euler, problem 96, pussel 1.
const EULER = '003020600900305001001806400008102900700000008006708200002609500800203009005010300';

describe('solver', () => {
  it('löser ett känt pussel och behåller ledtrådarna', () => {
    const puzzle = parseGrid(EULER);
    const solution = solve(puzzle)!;
    expect(isSolvedGrid(solution)).toBe(true);
    puzzle.forEach((v, i) => v && expect(solution[i]).toBe(v));
    expect(solution.slice(0, 3)).toEqual([4, 8, 3]);
  });

  it('räknar lösningar: 0, 1 och flera', () => {
    expect(hasUniqueSolution(parseGrid(EULER))).toBe(true);
    expect(countSolutions(new Array(CELLS).fill(0))).toBe(2);
    expect(countSolutions(new Array(CELLS).fill(0), 5)).toBe(5);

    const conflict = parseGrid(EULER);
    conflict[0] = 2; // 2 finns redan i första raden
    expect(countSolutions(conflict)).toBe(0);
    expect(solve(conflict)).toBeNull();
  });

  it('skapar slumpade, giltiga och deterministiska lösningar', () => {
    const a = randomSolution(mulberry32(1));
    const b = randomSolution(mulberry32(1));
    const c = randomSolution(mulberry32(2));
    expect(isSolvedGrid(a)).toBe(true);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

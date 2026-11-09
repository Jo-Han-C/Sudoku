import { describe, expect, it } from 'vitest';
import { parseGrid } from './board';
import { grade } from './grader';
import { solve } from './solver';

const EULER = '003020600900305001001806400008102900700000008006708200002609500800203009005010300';

describe('grader', () => {
  it('löser ett lätt pussel med bara singles', () => {
    const puzzle = parseGrid(EULER);
    const result = grade(puzzle, 5, { verifyAgainst: solve(puzzle)! });
    expect(result.solved).toBe(true);
    expect(result.level).toBe(1);
    expect(result.grid).toEqual(solve(puzzle));
  });

  it('kör fast när tillåten nivå är för låg', () => {
    // Ett känt svårt pussel ("AI Escargot") som inte går med enkla tekniker.
    const puzzle = parseGrid(
      '100007090030020008009600500005300900010080002600004000300000010040000007007000300',
    );
    const result = grade(puzzle, 1);
    expect(result.solved).toBe(false);
  });

  it('ger nivå 0 för ett redan löst rutnät', () => {
    const solved = solve(parseGrid(EULER))!;
    expect(grade(solved).level).toBe(0);
  });
});

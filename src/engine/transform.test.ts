import { describe, expect, it } from 'vitest';
import { isSolvedGrid } from './board';
import { generate } from './generator';
import { grade } from './grader';
import { mulberry32 } from './rng';
import { hasUniqueSolution, solve } from './solver';
import { applyTransform, randomTransform } from './transform';

describe('transform', () => {
  const { puzzle, solution } = generate('hard', mulberry32(3));

  it('bevarar giltighet, unik lösning och svårighetsgrad', () => {
    const rng = mulberry32(99);
    const level = grade(puzzle).level;
    for (let k = 0; k < 20; k++) {
      const t = randomTransform(rng);
      const p = applyTransform(puzzle, t);
      const s = applyTransform(solution, t);
      expect(isSolvedGrid(s)).toBe(true);
      expect(hasUniqueSolution(p)).toBe(true);
      expect(solve(p)).toEqual(s);
      expect(grade(p).level).toBe(level);
    }
  });

  it('ger olika varianter', () => {
    const rng = mulberry32(1);
    const a = applyTransform(puzzle, randomTransform(rng)).join('');
    const b = applyTransform(puzzle, randomTransform(rng)).join('');
    expect(a).not.toBe(b);
  });
});

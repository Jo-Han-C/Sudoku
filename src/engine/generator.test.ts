import { describe, expect, it } from 'vitest';
import { countGivens, serializeGrid } from './board';
import { DIFFICULTY_SPEC, type Difficulty } from './difficulty';
import { generate } from './generator';
import { grade } from './grader';
import { mulberry32 } from './rng';
import { hasUniqueSolution } from './solver';

describe('generator', () => {
  it('är deterministisk för samma seed', () => {
    const a = generate('easy', mulberry32(5));
    const b = generate('easy', mulberry32(5));
    expect(serializeGrid(a.puzzle)).toBe(serializeGrid(b.puzzle));
  });

  it.each<Difficulty>(['easy', 'medium', 'hard', 'expert'])(
    'skapar ett unikt pussel på nivån %s',
    (difficulty) => {
      const { puzzle, solution } = generate(difficulty, mulberry32(11));
      const spec = DIFFICULTY_SPEC[difficulty];
      expect(hasUniqueSolution(puzzle)).toBe(true);
      const result = grade(puzzle, 5, { verifyAgainst: solution });
      expect(result.solved).toBe(true);
      expect(result.level).toBeGreaterThanOrEqual(spec.minLevel);
      expect(result.level).toBeLessThanOrEqual(spec.maxLevel);
      expect(countGivens(puzzle)).toBeGreaterThanOrEqual(spec.clues[0]);
      expect(countGivens(puzzle)).toBeLessThanOrEqual(spec.clues[1]);
    },
  );
});

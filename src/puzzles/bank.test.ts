import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { countGivens, parseGrid } from '../engine/board';
import { DIFFICULTIES, DIFFICULTY_SPEC } from '../engine/difficulty';
import { grade, type Technique } from '../engine/grader';
import { mulberry32 } from '../engine/rng';
import { hasUniqueSolution, solve } from '../engine/solver';
import { loadBank, newPuzzle, parseBank, pickFromBank, pushRecent } from './bank';

const readBank = (d: string) =>
  parseBank(readFileSync(new URL(`../data/${d}.txt`, import.meta.url), 'utf8'));

describe('pusselbanken', () => {
  const used = new Set<Technique>();

  it.each(DIFFICULTIES)('%s: alla pussel är unika, lösbara och på rätt nivå', (difficulty) => {
    const bank = readBank(difficulty);
    const spec = DIFFICULTY_SPEC[difficulty];
    expect(bank.length).toBeGreaterThanOrEqual(300);
    expect(new Set(bank).size).toBe(bank.length);
    for (const line of bank) {
      expect(line).toMatch(/^[0-9]{81}$/);
      const puzzle = parseGrid(line);
      expect(hasUniqueSolution(puzzle)).toBe(true);
      const givens = countGivens(puzzle);
      expect(givens).toBeGreaterThanOrEqual(spec.clues[0]);
      expect(givens).toBeLessThanOrEqual(spec.clues[1]);
      const result = grade(puzzle, 5, { verifyAgainst: solve(puzzle)! });
      expect(result.solved).toBe(true);
      expect(result.level).toBeGreaterThanOrEqual(spec.minLevel);
      expect(result.level).toBeLessThanOrEqual(spec.maxLevel);
      for (const t of Object.keys(result.usage)) used.add(t as Technique);
    }
  });

  it('använder de viktigaste teknikerna någonstans i banken', () => {
    for (const t of [
      'hiddenSingle',
      'pointing',
      'nakedPair',
      'xWing',
      'xyWing',
      'simpleColoring',
    ]) {
      expect(used, t).toContain(t);
    }
  });
});

describe('pickFromBank', () => {
  it('ger ett transformerat pussel med korrekt lösning, snabbt', () => {
    const bank = readBank('expert');
    const t0 = performance.now();
    const p = pickFromBank(bank, 'expert', mulberry32(1));
    expect(performance.now() - t0).toBeLessThan(50);
    expect(p.puzzleId).toBe(`expert-${p.bankIndex}`);
    expect(solve(parseGrid(p.givens))!.join('')).toBe(p.solution);
    expect(grade(parseGrid(p.givens)).level).toBe(grade(parseGrid(bank[p.bankIndex]!)).level);
  });

  it('undviker nyligen spelade pussel', () => {
    const bank = readBank('easy');
    const recent = bank.map((_, i) => i).filter((i) => i !== 7);
    expect(pickFromBank(bank, 'easy', mulberry32(2), recent).bankIndex).toBe(7);
  });

  it('pushRecent lägger nytt först, tar bort dubbletter och begränsar längden', () => {
    expect(pushRecent([3, 2, 1], 2)).toEqual([2, 3, 1]);
    expect(
      pushRecent(
        Array.from({ length: 100 }, (_, i) => i),
        500,
      ),
    ).toHaveLength(100);
  });

  it('laddar banken via dynamisk import', async () => {
    expect((await loadBank('master')).length).toBeGreaterThanOrEqual(300);
    const p = await newPuzzle('medium', { rng: mulberry32(4) });
    expect(p.difficulty).toBe('medium');
  });
});

import { describe, expect, it } from 'vitest';
import {
  averageTimeMs,
  emptyStats,
  normalizeStats,
  recordLoss,
  recordStart,
  recordWin,
  totals,
  winRate,
} from './stats';

describe('stats', () => {
  it('räknar vinster, bästa tid, snitt och vinstrad', () => {
    let s = emptyStats();
    s = recordStart(s, 'hard');
    s = recordWin(s, 'hard', 300_000, 0);
    s = recordStart(s, 'hard');
    s = recordWin(s, 'hard', 200_000, 2);
    const h = s.byDifficulty.hard;
    expect(h).toMatchObject({ started: 2, won: 2, wonNoMistakes: 1, bestTimeMs: 200_000 });
    expect(h.currentStreak).toBe(2);
    expect(h.bestStreak).toBe(2);
    expect(averageTimeMs(h)).toBe(250_000);
    expect(winRate(h)).toBe(1);
    expect(s.byDifficulty.easy.started).toBe(0);
  });

  it('förlust och uppgivet spel nollställer vinstraden men inte bästa vinstrad', () => {
    let s = emptyStats();
    s = recordWin(recordStart(s, 'easy'), 'easy', 1000, 0);
    s = recordWin(recordStart(s, 'easy'), 'easy', 1000, 0);
    s = recordLoss(recordStart(s, 'easy'), 'easy', false);
    expect(s.byDifficulty.easy).toMatchObject({
      lost: 1,
      givenUp: 0,
      currentStreak: 0,
      bestStreak: 2,
    });
    s = recordLoss(recordStart(s, 'easy'), 'easy', true);
    expect(s.byDifficulty.easy).toMatchObject({ lost: 2, givenUp: 1 });
    expect(winRate(s.byDifficulty.easy)).toBe(0.5);
  });

  it('summerar alla nivåer', () => {
    let s = emptyStats();
    s = recordWin(recordStart(s, 'easy'), 'easy', 5000, 0);
    s = recordWin(recordStart(s, 'master'), 'master', 9000, 1);
    s = recordStart(s, 'medium');
    const t = totals(s);
    expect(t).toMatchObject({ started: 3, won: 2, bestTimeMs: 5000, bestStreak: 1 });
  });

  it('läser in trasig eller ofullständig statistik utan att krascha', () => {
    expect(normalizeStats(null)).toEqual(emptyStats());
    expect(normalizeStats('skräp')).toEqual(emptyStats());
    const s = normalizeStats({ byDifficulty: { easy: { won: 3, lost: 'x', started: -1 } } });
    expect(s.byDifficulty.easy.won).toBe(3);
    expect(s.byDifficulty.easy.lost).toBe(0);
    expect(s.byDifficulty.easy.started).toBe(0);
    expect(s.byDifficulty.master.won).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { createGame } from '../game/reducer';
import { DEFAULT_SETTINGS } from '../game/settings';
import { testPuzzle } from '../game/testing';
import { emptyStats, recordStart } from '../stats/stats';
import {
  KEYS,
  clearGame,
  loadGame,
  loadRecent,
  loadSettings,
  loadStats,
  memoryStore,
  saveGame,
  saveRecent,
  saveSettings,
  saveStats,
} from './storage';

describe('storage', () => {
  it('sparar ett pågående spel med speltid och öppnar det pausat', () => {
    const kv = memoryStore();
    const g = createGame(testPuzzle(), 0);
    saveGame(kv, g, 42_000);
    const loaded = loadGame(kv)!;
    expect(loaded.status).toBe('paused');
    expect(loaded.elapsedMs).toBe(42_000);
    expect(loaded.runningSince).toBeNull();
    expect(loaded.givens).toBe(g.givens);
    clearGame(kv);
    expect(loadGame(kv)).toBeNull();
  });

  it('ignorerar trasig JSON och felaktiga spel', () => {
    const kv = memoryStore();
    kv.setItem(KEYS.game, '{inte json');
    expect(loadGame(kv)).toBeNull();
    kv.setItem(KEYS.game, JSON.stringify({ v: 1, givens: 'kort' }));
    expect(loadGame(kv)).toBeNull();
    kv.setItem(KEYS.stats, '[[[');
    expect(loadStats(kv)).toEqual(emptyStats());
  });

  it('sparar statistik, inställningar och nyligen spelade pussel', () => {
    const kv = memoryStore();
    saveStats(kv, recordStart(emptyStats(), 'expert'));
    expect(loadStats(kv).byDifficulty.expert.started).toBe(1);

    saveSettings(kv, { ...DEFAULT_SETTINGS, haptics: false, lastDifficulty: 'master' });
    expect(loadSettings(kv)).toMatchObject({ haptics: false, lastDifficulty: 'master' });

    const recent = loadRecent(kv);
    expect(recent.easy).toEqual([]);
    saveRecent(kv, { ...recent, hard: [3, 1] });
    expect(loadRecent(kv).hard).toEqual([3, 1]);
  });

  it('fyller i standardinställningar för saknade eller felaktiga värden', () => {
    const kv = memoryStore();
    kv.setItem(KEYS.settings, JSON.stringify({ haptics: 'ja', lastDifficulty: 'omöjlig' }));
    expect(loadSettings(kv)).toEqual(DEFAULT_SETTINGS);
  });
});

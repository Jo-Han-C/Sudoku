import { computed, effect, signal } from '@preact/signals';
import type { Difficulty } from '../engine/difficulty';
import { createGame, reduce, restartGame, type Action } from '../game/reducer';
import type { Settings } from '../game/settings';
import type { GameState } from '../game/types';
import { newPuzzle, pushRecent } from '../puzzles/bank';
import { recordLoss, recordStart, recordWin, type Stats } from '../stats/stats';
import {
  browserStore,
  clearGame,
  loadGame,
  loadRecent,
  loadSettings,
  loadStats,
  saveGame,
  saveRecent,
  saveSettings,
  saveStats,
} from '../storage/storage';

const kv = browserStore();

export type Screen = 'home' | 'game';

export const screen = signal<Screen>('home');
export const settings = signal<Settings>(loadSettings(kv));
export const stats = signal<Stats>(loadStats(kv));
export const game = signal<GameState | null>(loadGame(kv));
/** Uppdateras varje sekund medan ett spel pågår, så att bara timern ritas om. */
export const now = signal(Date.now());
export const loading = signal(false);
/** Sant om senaste vinsten gav nytt rekord. */
export const lastWinWasRecord = signal(false);

/** Ett spel som går att fortsätta. */
export const resumableGame = computed(() => {
  const g = game.value;
  return g && (g.status === 'playing' || g.status === 'paused') ? g : null;
});

/** Ett pågående spel som räknas som uppgivet om man startar ett nytt. */
export const hasStartedGame = computed(() => resumableGame.value?.countedAsStarted ?? false);

function persistGame(g: GameState | null): void {
  if (g) saveGame(kv, g, Date.now());
  else clearGame(kv);
}

function setStats(s: Stats): void {
  stats.value = s;
  saveStats(kv, s);
}

export function updateSettings(patch: Partial<Settings>): void {
  settings.value = { ...settings.value, ...patch };
  saveSettings(kv, settings.value);
}

function vibrate(ms: number): void {
  if (settings.value.haptics && 'vibrate' in navigator) navigator.vibrate(ms);
}

type ActionWithoutTime =
  | Exclude<Action, { now: number }>
  | { type: 'input'; digit: number }
  | { type: 'pause' }
  | { type: 'resume' };

export function dispatch(action: ActionWithoutTime): void {
  const g = game.value;
  if (!g) return;
  const t = Date.now();
  const full = ('now' in action ? action : { ...action, now: t }) as Action;
  const next = reduce(g, full, settings.value);
  if (next === g) return;

  let s = stats.value;
  if (!g.countedAsStarted && next.countedAsStarted) s = recordStart(s, next.difficulty);
  if (next.mistakes > g.mistakes) vibrate(120);
  if (g.status !== 'won' && next.status === 'won') {
    const best = s.byDifficulty[next.difficulty].bestTimeMs;
    lastWinWasRecord.value = best !== null && next.elapsedMs < best;
    s = recordWin(s, next.difficulty, next.elapsedMs, next.mistakes);
  }
  if (g.status !== 'lost' && next.status === 'lost') s = recordLoss(s, next.difficulty, false);
  if (s !== stats.value) setStats(s);

  game.value = next;
  now.value = t;
  persistGame(next);
}

/** Avslutar ett pågående spel; har det startats räknas det som uppgivet. */
function abandonCurrentGame(): void {
  const g = resumableGame.value;
  if (g?.countedAsStarted) setStats(recordLoss(stats.value, g.difficulty, true));
}

export async function startNewGame(difficulty: Difficulty): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  try {
    abandonCurrentGame();
    const recent = loadRecent(kv);
    const p = await newPuzzle(difficulty, { recent: recent[difficulty] });
    saveRecent(kv, { ...recent, [difficulty]: pushRecent(recent[difficulty], p.bankIndex) });
    updateSettings({ lastDifficulty: difficulty });
    const g = createGame(p, Date.now());
    game.value = g;
    persistGame(g);
    showGame();
  } finally {
    loading.value = false;
  }
}

export function retrySamePuzzle(): void {
  const g = game.value;
  if (!g) return;
  abandonCurrentGame();
  const next = restartGame(g, Date.now());
  game.value = next;
  persistGame(next);
  showGame();
}

export function continueGame(): void {
  if (!resumableGame.value) return;
  showGame();
  dispatch({ type: 'resume' });
}

// ---- Navigering och Androids bakåtgest -----------------------------------

function showGame(): void {
  if (screen.value !== 'game') {
    screen.value = 'game';
    history.pushState({ screen: 'game' }, '');
  }
}

/** Pausar och går till startskärmen. */
export function leaveGame(): void {
  dispatch({ type: 'pause' });
  if (history.state?.screen === 'game') history.back();
  else screen.value = 'home';
}

window.addEventListener('popstate', () => {
  if (screen.value === 'game') {
    dispatch({ type: 'pause' });
    screen.value = 'home';
  }
});

// ---- Paus när appen göms, och sparning när den stängs ---------------------

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    dispatch({ type: 'pause' });
    persistGame(game.value);
  }
});
window.addEventListener('pagehide', () => persistGame(game.value));

// ---- Timer -------------------------------------------------------------------

effect(() => {
  if (screen.value !== 'game' || game.value?.status !== 'playing') return;
  const id = window.setInterval(() => (now.value = Date.now()), 1000);
  return () => window.clearInterval(id);
});

import { computed, effect, signal } from '@preact/signals';
import type { Difficulty } from '../engine/difficulty';
import { createGame, reduce, restartGame, type Action } from '../game/reducer';
import { canAutoComplete } from '../game/selectors';
import type { Settings } from '../game/settings';
import type { GameState } from '../game/types';
import { newPuzzle, pushRecent } from '../puzzles/bank';
import { emptyStats, recordLoss, recordStart, recordWin, type Stats } from '../stats/stats';
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

export type Screen = 'home' | 'game' | 'stats' | 'settings';

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

export function resetStats(): void {
  setStats(emptyStats());
}

export function updateSettings(patch: Partial<Settings>): void {
  settings.value = { ...settings.value, ...patch };
  saveSettings(kv, settings.value);
  if (patch.autoComplete) maybeAutoComplete();
}

function vibrate(ms: number): void {
  try {
    if (settings.value.haptics && 'vibrate' in navigator) navigator.vibrate(ms);
  } catch {
    // Vibration stöds inte.
  }
}

type ActionWithoutTime =
  | Exclude<Action, { now: number }>
  | { type: 'input'; digit: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'giveUp' }
  | { type: 'autoComplete' };

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
  // Ett spel utan drag räknas inte i statistiken, inte heller när man ger upp det.
  if (g.status !== 'lost' && next.status === 'lost' && next.countedAsStarted) {
    s = recordLoss(s, next.difficulty, next.givenUp === true);
  }
  if (s !== stats.value) setStats(s);

  game.value = next;
  now.value = t;
  persistGame(next);
  maybeAutoComplete();
}

/** Blixtknappen: fyll i resten när varje tom cell bara har en möjlig siffra. */
function maybeAutoComplete(): void {
  const g = game.value;
  if (g && settings.value.autoComplete && canAutoComplete(g)) dispatch({ type: 'autoComplete' });
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
    navigate('game');
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
  navigate('game');
}

export function continueGame(): void {
  if (!resumableGame.value) return;
  navigate('game');
  dispatch({ type: 'resume' });
}

// ---- Navigering och Androids bakåtgest -----------------------------------
//
// Varje skärm utom startskärmen är ett steg i webbläsarens historik, så att
// bakåtgesten fungerar. Att lämna spelskärmen pausar spelet.

/** Sant om spelet pausades för att inställningarna öppnades, så att det kan fortsätta efteråt. */
let pausedForSettings = false;

function setScreen(next: Screen): void {
  const prev = screen.value;
  if (prev === next) return;
  if (prev === 'game') {
    pausedForSettings = next === 'settings' && game.value?.status === 'playing';
    dispatch({ type: 'pause' });
  }
  if (next === 'game' && pausedForSettings) {
    pausedForSettings = false;
    dispatch({ type: 'resume' });
  }
  screen.value = next;
}

export function navigate(next: Screen): void {
  if (screen.value === next) return;
  if (next === 'home') {
    goBack();
    return;
  }
  history.pushState({ screen: next }, '');
  setScreen(next);
}

/** Tillbaka ett steg, som bakåtgesten. */
export function goBack(): void {
  if (history.state?.screen && history.state.screen !== 'home') history.back();
  else setScreen('home');
}

// Startskärmen är alltid första steget, även efter en omladdning.
history.replaceState({ screen: 'home' }, '');

window.addEventListener('popstate', (e) => {
  const target = (e.state as { screen?: Screen } | null)?.screen ?? 'home';
  if (target === 'game' && !game.value) setScreen('home');
  else setScreen(target);
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

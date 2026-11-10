import { PEERS, bit, colOf, rowOf } from '../engine/board';
import type { NewPuzzle } from '../puzzles/bank';
import { canAutoComplete, elapsedAt, isComplete, isGiven, isLocked, solutionAt } from './selectors';
import { MAX_MISTAKES, type CellState, type GameState, type Move } from './types';

export interface RuleOptions {
  mistakeLimit: boolean;
  autoRemoveNotes: boolean;
}

export type Action =
  | { type: 'select'; cell: number }
  | { type: 'moveSelection'; dir: 'up' | 'down' | 'left' | 'right' }
  | { type: 'input'; digit: number; now: number }
  | { type: 'erase' }
  | { type: 'undo' }
  | { type: 'togglePencil' }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'giveUp'; now: number }
  | { type: 'autoComplete'; now: number }
  | { type: 'declineAutoComplete' };

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function createGame(p: NewPuzzle, now: number): GameState {
  return {
    v: 1,
    id: newId(),
    difficulty: p.difficulty,
    puzzleId: p.puzzleId,
    bankIndex: p.bankIndex,
    givens: p.givens,
    solution: p.solution,
    values: Array.from(p.givens, (ch) => ch.charCodeAt(0) - 48),
    notes: new Array<number>(81).fill(0),
    mistakes: 0,
    elapsedMs: 0,
    runningSince: now,
    status: 'playing',
    history: [],
    countedAsStarted: false,
    selected: null,
    pencil: false,
    createdAt: now,
  };
}

/** Samma pussel från början, som ett nytt spel ("Försök igen"). */
export const restartGame = (g: GameState, now: number): GameState =>
  createGame(
    {
      difficulty: g.difficulty,
      puzzleId: g.puzzleId,
      bankIndex: g.bankIndex,
      givens: g.givens,
      solution: g.solution,
    },
    now,
  );

function applyMove(g: GameState, move: Move): GameState {
  const values = g.values.slice();
  const notes = g.notes.slice();
  values[move.cell] = move.next.value;
  notes[move.cell] = move.next.notes;
  for (const { cell } of move.peerNotesCleared ?? []) notes[cell]! &= ~bit(move.next.value);
  return { ...g, values, notes, history: [...g.history, move], countedAsStarted: true };
}

function endGame(g: GameState, status: 'won' | 'lost', now: number): GameState {
  return { ...g, status, elapsedMs: elapsedAt(g, now), runningSince: null, endedAt: now };
}

const cellState = (g: GameState, i: number): CellState => ({
  value: g.values[i]!,
  notes: g.notes[i]!,
});

function input(g: GameState, digit: number, now: number, opts: RuleOptions): GameState {
  const i = g.selected;
  if (i === null || isGiven(g, i) || isLocked(g, i)) return g;
  const prev = cellState(g, i);

  if (g.pencil) {
    if (prev.value !== 0) return g;
    return applyMove(g, { cell: i, prev, next: { value: 0, notes: prev.notes ^ bit(digit) } });
  }

  if (prev.value === digit) return g;
  const correct = digit === solutionAt(g, i);
  const move: Move = { cell: i, prev, next: { value: digit, notes: 0 } };
  if (correct && opts.autoRemoveNotes) {
    const cleared = PEERS[i]!.filter((p) => g.notes[p]! & bit(digit)).map((p) => ({
      cell: p,
      notes: g.notes[p]!,
    }));
    if (cleared.length) move.peerNotesCleared = cleared;
  }

  let next = applyMove(g, move);
  if (!correct) next = { ...next, mistakes: next.mistakes + 1 };
  if (correct && isComplete(next)) return endGame(next, 'won', now);
  if (!correct && opts.mistakeLimit && next.mistakes >= MAX_MISTAKES) {
    return endGame(next, 'lost', now);
  }
  return next;
}

function erase(g: GameState): GameState {
  const i = g.selected;
  if (i === null || isGiven(g, i) || isLocked(g, i)) return g;
  const prev = cellState(g, i);
  if (prev.value === 0 && prev.notes === 0) return g;
  // En fel siffra raderas först; finns ingen siffra raderas anteckningarna.
  return applyMove(g, { cell: i, prev, next: { value: 0, notes: 0 } });
}

function undo(g: GameState): GameState {
  const move = g.history.at(-1);
  if (!move) return g;
  const values = g.values.slice();
  const notes = g.notes.slice();
  values[move.cell] = move.prev.value;
  notes[move.cell] = move.prev.notes;
  for (const { cell, notes: before } of move.peerNotesCleared ?? []) notes[cell] = before;
  // Misstag och tid backas inte.
  return { ...g, values, notes, history: g.history.slice(0, -1), selected: move.cell };
}

function moveSelection(g: GameState, dir: 'up' | 'down' | 'left' | 'right'): GameState {
  const cur = g.selected ?? 40;
  let r = rowOf(cur);
  let c = colOf(cur);
  if (g.selected !== null) {
    if (dir === 'up') r = (r + 8) % 9;
    if (dir === 'down') r = (r + 1) % 9;
    if (dir === 'left') c = (c + 8) % 9;
    if (dir === 'right') c = (c + 1) % 9;
  }
  return { ...g, selected: r * 9 + c };
}

/** Ge upp: spelet räknas som förlorat och lösningen visas. */
function giveUp(g: GameState, now: number): GameState {
  const revealed: number[] = [];
  const values = g.values.map((v, i) => {
    const s = solutionAt(g, i);
    if (v !== s) revealed.push(i);
    return s;
  });
  return {
    ...endGame(g, 'lost', now),
    values,
    notes: new Array<number>(81).fill(0),
    givenUp: true,
    revealed,
    selected: null,
  };
}

/** Fyller i alla tomma celler när var och en bara har en möjlig siffra. */
function autoComplete(g: GameState, now: number): GameState {
  if (!canAutoComplete(g)) return g;
  const autoFilled: number[] = [];
  const values = g.values.map((v, i) => {
    if (v) return v;
    autoFilled.push(i);
    return solutionAt(g, i);
  });
  const notes = g.notes.map((n, i) => (autoFilled.includes(i) ? 0 : n));
  return { ...endGame({ ...g, values, notes }, 'won', now), autoFilled, selected: null };
}

/** Ren funktion: returnerar samma objekt om åtgärden inte ändrar något. */
export function reduce(g: GameState, action: Action, opts: RuleOptions): GameState {
  switch (action.type) {
    case 'pause':
      if (g.status !== 'playing') return g;
      return { ...g, status: 'paused', elapsedMs: elapsedAt(g, action.now), runningSince: null };
    case 'resume':
      if (g.status !== 'paused') return g;
      return { ...g, status: 'playing', runningSince: action.now };
    case 'giveUp':
      if (g.status !== 'playing' && g.status !== 'paused') return g;
      return giveUp(g, action.now);
  }
  if (g.status !== 'playing') return g;
  switch (action.type) {
    case 'select':
      return g.selected === action.cell ? g : { ...g, selected: action.cell };
    case 'moveSelection':
      return moveSelection(g, action.dir);
    case 'togglePencil':
      return { ...g, pencil: !g.pencil };
    case 'input':
      return input(g, action.digit, action.now, opts);
    case 'erase':
      return erase(g);
    case 'undo':
      return undo(g);
    case 'autoComplete':
      return autoComplete(g, action.now);
    case 'declineAutoComplete':
      return g.autoCompleteDeclined ? g : { ...g, autoCompleteDeclined: true };
  }
}

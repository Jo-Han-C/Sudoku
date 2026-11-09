import { describe, expect, it } from 'vitest';
import { bit } from '../engine/board';
import { createGame, reduce, restartGame, type Action, type RuleOptions } from './reducer';
import {
  canAutoComplete,
  completedUnitCells,
  elapsedAt,
  progress,
  remainingDigits,
  solutionAt,
} from './selectors';
import { nearlySolved, testPuzzle } from './testing';
import type { GameState } from './types';

const OPTS: RuleOptions = { mistakeLimit: true, autoRemoveNotes: true };
const run = (g: GameState, ...actions: Action[]) => actions.reduce((s, a) => reduce(s, a, OPTS), g);
const game = () => createGame(testPuzzle(), 1000);

// Cell 0 är tom i testpusslet; rätt siffra är 4.
const EMPTY = 0;
const wrongDigit = (g: GameState, i: number) => (solutionAt(g, i) % 9) + 1;

describe('reducer', () => {
  it('skapar ett spel med givna siffror och tom historik', () => {
    const g = game();
    expect(g.values[2]).toBe(3);
    expect(g.values[EMPTY]).toBe(0);
    expect(g.status).toBe('playing');
    expect(progress(g)).toEqual({ filled: 0, total: 81 - 32 });
  });

  it('placerar rätt siffra, låser cellen och räknar som startat', () => {
    const g = run(game(), { type: 'select', cell: EMPTY }, { type: 'input', digit: 4, now: 2000 });
    expect(g.values[EMPTY]).toBe(4);
    expect(g.countedAsStarted).toBe(true);
    expect(g.mistakes).toBe(0);
    // Låst: går varken att skriva över eller radera.
    expect(run(g, { type: 'input', digit: 5, now: 3000 }).values[EMPTY]).toBe(4);
    expect(run(g, { type: 'erase' }).values[EMPTY]).toBe(4);
  });

  it('kan inte ändra givna siffror', () => {
    const g = run(game(), { type: 'select', cell: 2 }, { type: 'input', digit: 5, now: 2000 });
    expect(g.values[2]).toBe(3);
    expect(g.history).toHaveLength(0);
  });

  it('räknar misstag, låter fel siffra ligga kvar och förlorar vid 3', () => {
    let g = run(game(), { type: 'select', cell: EMPTY });
    const w = wrongDigit(g, EMPTY);
    g = run(g, { type: 'input', digit: w, now: 2000 });
    expect(g.values[EMPTY]).toBe(w);
    expect(g.mistakes).toBe(1);
    // Samma fel siffra igen räknas inte.
    expect(run(g, { type: 'input', digit: w, now: 2100 }).mistakes).toBe(1);
    g = run(g, { type: 'erase' });
    expect(g.values[EMPTY]).toBe(0);
    g = run(
      g,
      { type: 'input', digit: wrongDigit(g, EMPTY), now: 3000 },
      { type: 'erase' },
      { type: 'input', digit: wrongDigit(g, EMPTY), now: 4000 },
    );
    expect(g.mistakes).toBe(3);
    expect(g.status).toBe('lost');
    expect(g.runningSince).toBeNull();
    // Inga drag efter förlust.
    expect(run(g, { type: 'erase' })).toBe(g);
  });

  it('förlorar inte när misstagsgränsen är avstängd', () => {
    let g = run(game(), { type: 'select', cell: EMPTY });
    for (let k = 0; k < 4; k++) {
      g = reduce(
        g,
        { type: 'input', digit: wrongDigit(g, EMPTY), now: 2000 },
        {
          ...OPTS,
          mistakeLimit: false,
        },
      );
      g = reduce(g, { type: 'erase' }, OPTS);
    }
    expect(g.mistakes).toBe(4);
    expect(g.status).toBe('playing');
  });

  it('pennläget växlar anteckningar och påverkar inte celler med siffra', () => {
    let g = run(game(), { type: 'select', cell: EMPTY }, { type: 'togglePencil' });
    g = run(g, { type: 'input', digit: 4, now: 0 }, { type: 'input', digit: 7, now: 0 });
    expect(g.notes[EMPTY]).toBe(bit(4) | bit(7));
    g = run(g, { type: 'input', digit: 7, now: 0 });
    expect(g.notes[EMPTY]).toBe(bit(4));
    expect(g.values[EMPTY]).toBe(0);
    expect(g.mistakes).toBe(0);
    // Radera tar bort anteckningar.
    expect(run(g, { type: 'erase' }).notes[EMPTY]).toBe(0);
  });

  it('tar bort anteckningar i peers vid rätt siffra och återställer dem vid ångra', () => {
    // Anteckna 4 i cell 1 (samma rad) och cell 18 (samma kolumn), och 4 i cell 80 (ingen peer).
    let g = run(game(), { type: 'togglePencil' });
    for (const cell of [1, 18, 80])
      g = run(g, { type: 'select', cell }, { type: 'input', digit: 4, now: 0 });
    g = run(
      g,
      { type: 'togglePencil' },
      { type: 'select', cell: EMPTY },
      { type: 'input', digit: 4, now: 0 },
    );
    expect(g.notes[1]).toBe(0);
    expect(g.notes[18]).toBe(0);
    expect(g.notes[80]).toBe(bit(4));

    g = run(g, { type: 'undo' });
    expect(g.values[EMPTY]).toBe(0);
    expect(g.notes[1]).toBe(bit(4));
    expect(g.notes[18]).toBe(bit(4));
    expect(g.selected).toBe(EMPTY);
  });

  it('rör inte anteckningar vid fel siffra', () => {
    let g = run(game(), { type: 'togglePencil' }, { type: 'select', cell: 1 });
    const w = wrongDigit(g, EMPTY);
    g = run(g, { type: 'input', digit: w, now: 0 }, { type: 'togglePencil' });
    g = run(g, { type: 'select', cell: EMPTY }, { type: 'input', digit: w, now: 0 });
    expect(g.notes[1]).toBe(bit(w));
  });

  it('ångra backar inte misstagsräknaren', () => {
    let g = run(game(), { type: 'select', cell: EMPTY });
    g = run(g, { type: 'input', digit: wrongDigit(g, EMPTY), now: 0 }, { type: 'undo' });
    expect(g.values[EMPTY]).toBe(0);
    expect(g.mistakes).toBe(1);
  });

  it('vinner när sista cellen fylls i', () => {
    let g = createGame(nearlySolved([0, 40]), 1000);
    g = run(g, { type: 'select', cell: 0 }, { type: 'input', digit: solutionAt(g, 0), now: 2000 });
    expect(g.status).toBe('playing');
    g = run(
      g,
      { type: 'select', cell: 40 },
      { type: 'input', digit: solutionAt(g, 40), now: 61_000 },
    );
    expect(g.status).toBe('won');
    expect(g.elapsedMs).toBe(60_000);
    expect(g.endedAt).toBe(61_000);
    expect(remainingDigits(g).slice(1)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('pausar och återupptar timern', () => {
    let g = createGame(testPuzzle(), 0);
    g = run(g, { type: 'pause', now: 10_000 });
    expect(g.status).toBe('paused');
    expect(elapsedAt(g, 50_000)).toBe(10_000);
    // Inga drag medan spelet är pausat.
    expect(run(g, { type: 'select', cell: 0 })).toBe(g);
    g = run(g, { type: 'resume', now: 50_000 });
    expect(elapsedAt(g, 55_000)).toBe(15_000);
  });

  it('flyttar markeringen med piltangenter och slår runt', () => {
    let g = run(game(), { type: 'moveSelection', dir: 'up' });
    expect(g.selected).toBe(40);
    g = run(g, { type: 'select', cell: 0 }, { type: 'moveSelection', dir: 'left' });
    expect(g.selected).toBe(8);
    g = run(g, { type: 'moveSelection', dir: 'up' });
    expect(g.selected).toBe(80);
  });

  it('Försök igen ger samma pussel från början', () => {
    const g = run(game(), { type: 'select', cell: EMPTY }, { type: 'input', digit: 4, now: 0 });
    const again = restartGame(g, 5000);
    expect(again.givens).toBe(g.givens);
    expect(again.values[EMPTY]).toBe(0);
    expect(again.id).not.toBe(g.id);
    expect(again.countedAsStarted).toBe(false);
  });

  it('räknar antal kvar per siffra', () => {
    const g = game();
    const remaining = remainingDigits(g);
    const givenCount = (d: number) => [...g.givens].filter((ch) => ch === String(d)).length;
    for (let d = 1; d <= 9; d++) expect(remaining[d]).toBe(9 - givenCount(d));
  });
});

describe('ge upp', () => {
  it('avslutar som förlust, visar lösningen och markerar avslöjade celler', () => {
    let g = run(game(), { type: 'select', cell: EMPTY }, { type: 'input', digit: 4, now: 0 });
    g = run(g, { type: 'pause', now: 5000 }, { type: 'giveUp', now: 9000 });
    expect(g.status).toBe('lost');
    expect(g.givenUp).toBe(true);
    expect(g.values.join('')).toBe(g.solution);
    expect(g.revealed).not.toContain(EMPTY);
    expect(g.revealed).toHaveLength(81 - 32 - 1);
    expect(g.elapsedMs).toBe(4000);
  });

  it('går inte att ge upp ett avslutat spel', () => {
    let g = createGame(nearlySolved([0]), 0);
    g = run(g, { type: 'select', cell: 0 }, { type: 'input', digit: solutionAt(g, 0), now: 1 });
    expect(run(g, { type: 'giveUp', now: 2 })).toBe(g);
  });
});

describe('autokomplettering', () => {
  it('kan köras när varje tom cell bara har en möjlig siffra', () => {
    const g = createGame(nearlySolved([0, 10, 40, 80]), 0);
    expect(canAutoComplete(g)).toBe(true);
    const done = run(g, { type: 'autoComplete', now: 30_000 });
    expect(done.status).toBe('won');
    expect(done.autoFilled).toEqual([0, 10, 40, 80]);
    expect(done.elapsedMs).toBe(30_000);
  });

  it('körs inte tidigt i spelet eller när en fel siffra finns', () => {
    expect(canAutoComplete(game())).toBe(false);
    expect(run(game(), { type: 'autoComplete', now: 1 }).status).toBe('playing');

    let g = createGame(nearlySolved([0, 40]), 0);
    g = run(g, { type: 'select', cell: 0 }, { type: 'input', digit: wrongDigit(g, 0), now: 1 });
    expect(canAutoComplete(g)).toBe(false);
  });

  it('körs inte när två tomma celler i samma enhet kan byta siffror', () => {
    // Hela rad 0 tom: varje cell har nio möjliga siffror i raden men begränsas av kolumn och box.
    const g = createGame(nearlySolved([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), 0);
    expect(canAutoComplete(g)).toBe(false);
  });
});

describe('klara enheter', () => {
  it('hittar rad, kolumn och box som blev klara av en siffra', () => {
    // Bara cell 0 tom: när den fylls blir rad 0, kolumn 0 och box 0 klara.
    let g = createGame(nearlySolved([0, 80]), 0);
    g = run(g, { type: 'select', cell: 0 }, { type: 'input', digit: solutionAt(g, 0), now: 1 });
    const cells = completedUnitCells(g, 0);
    expect(cells).toContain(8); // rad 0
    expect(cells).toContain(72); // kolumn 0
    expect(cells).toContain(20); // box 0
    expect(cells).toHaveLength(9 + 8 + 8 - 4);
  });

  it('ger inget när enheten fortfarande har tomma celler', () => {
    let g = createGame(nearlySolved([0, 1]), 0);
    g = run(g, { type: 'select', cell: 0 }, { type: 'input', digit: solutionAt(g, 0), now: 1 });
    // Rad 0 och box 0 har cell 1 tom; bara kolumn 0 är klar.
    expect(completedUnitCells(g, 0).sort((a, b) => a - b)).toEqual([
      0, 9, 18, 27, 36, 45, 54, 63, 72,
    ]);
  });
});

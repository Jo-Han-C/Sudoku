import type { Difficulty } from '../engine/difficulty';

export interface CellState {
  value: number;
  /** 9-bitars mask med anteckningar (bit 0 = siffran 1). */
  notes: number;
}

/** En användaråtgärd som ångras som en helhet. */
export interface Move {
  cell: number;
  prev: CellState;
  next: CellState;
  /** Anteckningar som togs bort automatiskt i andra celler, med värdet före borttagningen. */
  peerNotesCleared?: { cell: number; notes: number }[];
}

export type GameStatus = 'playing' | 'paused' | 'won' | 'lost';

export interface GameState {
  v: 1;
  id: string;
  difficulty: Difficulty;
  puzzleId: string;
  bankIndex: number;
  /** 81 tecken, 0 = tom cell. */
  givens: string;
  solution: string;
  /** Alla siffror på brädet, inklusive de givna. */
  values: number[];
  notes: number[];
  mistakes: number;
  /** Speltid som redan räknats, i millisekunder. */
  elapsedMs: number;
  /** Tidpunkt då pågående speltid började, eller null om timern står still. */
  runningSince: number | null;
  status: GameStatus;
  history: Move[];
  /** Blir sant vid första draget. Först då räknas spelet som startat i statistiken. */
  countedAsStarted: boolean;
  selected: number | null;
  pencil: boolean;
  createdAt: number;
  endedAt?: number;
}

export const MAX_MISTAKES = 3;

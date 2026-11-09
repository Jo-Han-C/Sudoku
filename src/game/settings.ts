import { isDifficulty, type Difficulty } from '../engine/difficulty';

export interface Settings {
  v: 1;
  /** 3 misstag = förlust. */
  mistakeLimit: boolean;
  /** Markera rad, kolumn och box för vald cell. */
  highlightPeers: boolean;
  /** Markera alla celler med samma siffra som vald cell. */
  highlightSameDigit: boolean;
  /** Ta bort anteckningar i rad, kolumn och box när en rätt siffra placeras. */
  autoRemoveNotes: boolean;
  /** Dölj siffror i sifferfältet när alla nio är placerade. */
  hideCompletedDigits: boolean;
  showTimer: boolean;
  /** Vibrera vid misstag. */
  haptics: boolean;
  /** Fyll i resten automatiskt när pusslet nästan är klart (blixtknappen). */
  autoComplete: boolean;
  lastDifficulty: Difficulty;
}

export const DEFAULT_SETTINGS: Settings = {
  v: 1,
  mistakeLimit: true,
  highlightPeers: true,
  highlightSameDigit: true,
  autoRemoveNotes: true,
  hideCompletedDigits: true,
  showTimer: true,
  haptics: true,
  autoComplete: true,
  lastDifficulty: 'easy',
};

/** Läser in sparade inställningar och fyller i standardvärden för det som saknas eller är ogiltigt. */
export function normalizeSettings(raw: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (key === 'v' || key === 'lastDifficulty') continue;
    if (typeof r[key] === 'boolean') (out[key] as boolean) = r[key];
  }
  if (isDifficulty(r.lastDifficulty)) out.lastDifficulty = r.lastDifficulty;
  return out;
}

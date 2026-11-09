/** Brädet lagras som 81 celler, index 0–80, rad för rad. 0 betyder tom cell. */
export type Grid = number[];

export const SIZE = 9;
export const CELLS = SIZE * SIZE;
export const ALL_DIGITS = 0x1ff;

export const rowOf = (i: number): number => Math.floor(i / SIZE);
export const colOf = (i: number): number => i % SIZE;
export const boxOf = (i: number): number => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

/** Bitmask för en siffra 1–9. */
export const bit = (d: number): number => 1 << (d - 1);

export function popcount(mask: number): number {
  let n = 0;
  while (mask) {
    mask &= mask - 1;
    n++;
  }
  return n;
}

/** Siffrorna 1–9 som finns i en mask, i stigande ordning. */
export function digitsOf(mask: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) if (mask & bit(d)) out.push(d);
  return out;
}

/** 27 enheter: rader 0–8, kolumner 9–17, boxar 18–26. */
export const UNITS: readonly (readonly number[])[] = (() => {
  const units: number[][] = [];
  for (let r = 0; r < 9; r++) units.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) units.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
  for (let b = 0; b < 9; b++) {
    const r0 = Math.floor(b / 3) * 3;
    const c0 = (b % 3) * 3;
    units.push(Array.from({ length: 9 }, (_, k) => (r0 + Math.floor(k / 3)) * 9 + c0 + (k % 3)));
  }
  return units;
})();

export const ROW_UNITS = UNITS.slice(0, 9);
export const COL_UNITS = UNITS.slice(9, 18);
export const BOX_UNITS = UNITS.slice(18, 27);

/** För varje cell: de 20 andra cellerna i samma rad, kolumn eller box. */
export const PEERS: readonly (readonly number[])[] = Array.from({ length: CELLS }, (_, i) => {
  const peers: number[] = [];
  for (let j = 0; j < CELLS; j++) {
    if (j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i))) {
      peers.push(j);
    }
  }
  return peers;
});

/** Snabb kontroll om två olika celler ser varandra. */
export const sees = (a: number, b: number): boolean =>
  a !== b && (rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b));

/** Läser 81 tecken där '0' eller '.' är tom cell. */
export function parseGrid(s: string): Grid {
  if (s.length !== CELLS) throw new Error(`Rutnätet måste ha 81 tecken, fick ${s.length}`);
  return Array.from(s, (ch) => {
    if (ch === '.' || ch === '0') return 0;
    const d = ch.charCodeAt(0) - 48;
    if (d < 1 || d > 9) throw new Error(`Ogiltigt tecken: ${ch}`);
    return d;
  });
}

export const serializeGrid = (g: Grid): string => g.join('');

export const countGivens = (g: Grid): number => g.reduce((n, v) => n + (v ? 1 : 0), 0);

/** Sant om inga ifyllda siffror krockar i någon rad, kolumn eller box. */
export function isConsistent(g: Grid): boolean {
  for (const unit of UNITS) {
    let seen = 0;
    for (const i of unit) {
      const v = g[i]!;
      if (!v) continue;
      if (seen & bit(v)) return false;
      seen |= bit(v);
    }
  }
  return true;
}

/** Sant om rutnätet är helt ifyllt och giltigt. */
export const isSolvedGrid = (g: Grid): boolean =>
  g.every((v) => v >= 1 && v <= 9) && isConsistent(g);

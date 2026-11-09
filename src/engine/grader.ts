import {
  ALL_DIGITS,
  BOX_UNITS,
  CELLS,
  COL_UNITS,
  PEERS,
  ROW_UNITS,
  UNITS,
  bit,
  boxOf,
  colOf,
  popcount,
  rowOf,
  sees,
  type Grid,
} from './board';

/**
 * Logisk lösare som bara använder tekniker som en människa använder.
 * Svårighetsgraden för ett pussel är nivån på den svåraste teknik som behövs.
 */

export type Technique =
  | 'nakedSingle'
  | 'hiddenSingle'
  | 'pointing'
  | 'claiming'
  | 'nakedPair'
  | 'hiddenPair'
  | 'nakedTriple'
  | 'hiddenTriple'
  | 'xWing'
  | 'swordfish'
  | 'xyWing'
  | 'nakedQuad'
  | 'hiddenQuad'
  | 'jellyfish'
  | 'xyzWing'
  | 'simpleColoring';

/** Nivå 1 = Lätt, 2 = Medel, 3 = Svår, 4 = Expert, 5 = Mästare. */
export type Level = 1 | 2 | 3 | 4 | 5;

export interface GradeResult {
  /** Sant om pusslet gick att lösa helt med tillåtna tekniker. */
  solved: boolean;
  /** Högsta nivå som användes (0 om pusslet redan var löst). */
  level: Level | 0;
  /** Hur många gånger varje teknik gav framsteg. */
  usage: Partial<Record<Technique, number>>;
  /** Rutnätet så långt det gick att lösa. */
  grid: Grid;
}

class LogicState {
  values: Grid = new Array<number>(CELLS).fill(0);
  cand: number[] = new Array<number>(CELLS).fill(ALL_DIGITS);

  constructor(puzzle: Grid) {
    for (let i = 0; i < CELLS; i++) if (puzzle[i]) this.place(i, puzzle[i]!);
  }

  place(i: number, d: number): void {
    this.values[i] = d;
    this.cand[i] = 0;
    const m = ~bit(d);
    for (const p of PEERS[i]!) this.cand[p]! &= m;
  }

  /** Tar bort kandidater ur en cell. Sant om något faktiskt togs bort. */
  eliminate(i: number, mask: number): boolean {
    if (this.cand[i]! & mask) {
      this.cand[i]! &= ~mask;
      return true;
    }
    return false;
  }

  /** Cellerna i en enhet som har siffran d som kandidat. */
  positions(unit: readonly number[], d: number): number[] {
    const m = bit(d);
    return unit.filter((i) => this.cand[i]! & m);
  }

  unitHas(unit: readonly number[], d: number): boolean {
    return unit.some((i) => this.values[i] === d);
  }

  get solved(): boolean {
    return this.values.every((v) => v !== 0);
  }
}

function* combinations<T>(
  items: readonly T[],
  k: number,
  start = 0,
  acc: T[] = [],
): Generator<T[]> {
  if (acc.length === k) {
    yield acc.slice();
    return;
  }
  for (let i = start; i <= items.length - (k - acc.length); i++) {
    acc.push(items[i]!);
    yield* combinations(items, k, i + 1, acc);
    acc.pop();
  }
}

// ---- Nivå 1 -------------------------------------------------------------

function nakedSingle(s: LogicState): boolean {
  let progress = false;
  for (let i = 0; i < CELLS; i++) {
    const c = s.cand[i]!;
    if (!s.values[i] && c && (c & (c - 1)) === 0) {
      s.place(i, Math.log2(c) + 1);
      progress = true;
    }
  }
  return progress;
}

function hiddenSingle(s: LogicState): boolean {
  let progress = false;
  for (const unit of UNITS) {
    for (let d = 1; d <= 9; d++) {
      const pos = s.positions(unit, d);
      if (pos.length === 1 && !s.unitHas(unit, d)) {
        s.place(pos[0]!, d);
        progress = true;
      }
    }
  }
  return progress;
}

// ---- Nivå 2 -------------------------------------------------------------

/** Pointing: en siffra i en box finns bara i en rad/kolumn, så den tas bort från resten av linjen. */
function pointing(s: LogicState): boolean {
  let progress = false;
  for (let b = 0; b < 9; b++) {
    for (let d = 1; d <= 9; d++) {
      const pos = s.positions(BOX_UNITS[b]!, d);
      if (pos.length < 2) continue;
      const r = rowOf(pos[0]!);
      const c = colOf(pos[0]!);
      const line = pos.every((i) => rowOf(i) === r)
        ? ROW_UNITS[r]!
        : pos.every((i) => colOf(i) === c)
          ? COL_UNITS[c]!
          : null;
      if (!line) continue;
      for (const i of line) if (boxOf(i) !== b && s.eliminate(i, bit(d))) progress = true;
    }
  }
  return progress;
}

/** Box/line: en siffra i en rad/kolumn finns bara i en box, så den tas bort från resten av boxen. */
function claiming(s: LogicState): boolean {
  let progress = false;
  for (const line of [...ROW_UNITS, ...COL_UNITS]) {
    for (let d = 1; d <= 9; d++) {
      const pos = s.positions(line, d);
      if (pos.length < 2) continue;
      const b = boxOf(pos[0]!);
      if (!pos.every((i) => boxOf(i) === b)) continue;
      for (const i of BOX_UNITS[b]!)
        if (!line.includes(i) && s.eliminate(i, bit(d))) progress = true;
    }
  }
  return progress;
}

/** Naken grupp: n celler i en enhet delar exakt n kandidater. */
function nakedSubset(s: LogicState, n: number): boolean {
  let progress = false;
  for (const unit of UNITS) {
    const empty = unit.filter((i) => !s.values[i]);
    if (empty.length <= n) continue;
    const small = empty.filter((i) => {
      const k = popcount(s.cand[i]!);
      return k >= 2 && k <= n;
    });
    for (const combo of combinations(small, n)) {
      const union = combo.reduce((m, i) => m | s.cand[i]!, 0);
      if (popcount(union) !== n) continue;
      for (const i of empty) if (!combo.includes(i) && s.eliminate(i, union)) progress = true;
      if (progress) return true;
    }
  }
  return progress;
}

/** Dold grupp: n siffror i en enhet får bara plats i samma n celler. */
function hiddenSubset(s: LogicState, n: number): boolean {
  for (const unit of UNITS) {
    const digits: number[] = [];
    const posMask: number[] = [];
    for (let d = 1; d <= 9; d++) {
      if (s.unitHas(unit, d)) continue;
      let pm = 0;
      unit.forEach((i, k) => {
        if (s.cand[i]! & bit(d)) pm |= 1 << k;
      });
      const k = popcount(pm);
      if (k >= 2 && k <= n) {
        digits.push(d);
        posMask[d] = pm;
      }
    }
    if (digits.length < n) continue;
    for (const combo of combinations(digits, n)) {
      const cover = combo.reduce((m, d) => m | posMask[d]!, 0);
      if (popcount(cover) !== n) continue;
      const keep = combo.reduce((m, d) => m | bit(d), 0);
      let progress = false;
      unit.forEach((i, k) => {
        if (cover & (1 << k) && s.eliminate(i, ALL_DIGITS & ~keep)) progress = true;
      });
      if (progress) return true;
    }
  }
  return false;
}

// ---- Nivå 4–5: fiskar och wings -----------------------------------------

/** X-wing (n=2), Swordfish (n=3) och Jellyfish (n=4). */
function fish(s: LogicState, n: number): boolean {
  for (let d = 1; d <= 9; d++) {
    const m = bit(d);
    for (const [base, cross] of [
      [ROW_UNITS, COL_UNITS],
      [COL_UNITS, ROW_UNITS],
    ] as const) {
      const lines: { idx: number; mask: number }[] = [];
      base.forEach((unit, idx) => {
        let mask = 0;
        unit.forEach((i, k) => {
          if (s.cand[i]! & m) mask |= 1 << k;
        });
        const k = popcount(mask);
        if (k >= 2 && k <= n) lines.push({ idx, mask });
      });
      if (lines.length < n) continue;
      for (const combo of combinations(lines, n)) {
        const cover = combo.reduce((acc, l) => acc | l.mask, 0);
        if (popcount(cover) !== n) continue;
        const baseIdx = new Set(combo.map((l) => l.idx));
        let progress = false;
        for (let k = 0; k < 9; k++) {
          if (!(cover & (1 << k))) continue;
          cross[k]!.forEach((i, j) => {
            if (!baseIdx.has(j) && s.eliminate(i, m)) progress = true;
          });
        }
        if (progress) return true;
      }
    }
  }
  return false;
}

/** XY-wing: pivot {x,y}, pincers {x,z} och {y,z}. z tas bort där båda pincers syns. */
function xyWing(s: LogicState): boolean {
  const bivalue = [];
  for (let i = 0; i < CELLS; i++) if (popcount(s.cand[i]!) === 2) bivalue.push(i);
  for (const p of bivalue) {
    const cp = s.cand[p]!;
    for (const a of bivalue) {
      if (!sees(p, a)) continue;
      const ca = s.cand[a]!;
      const shared = ca & cp;
      if (popcount(shared) !== 1) continue;
      const z = ca & ~cp;
      const want = (cp & ~shared) | z;
      for (const b of bivalue) {
        if (b === a || !sees(p, b) || s.cand[b] !== want) continue;
        let progress = false;
        for (let i = 0; i < CELLS; i++) {
          if (i !== a && i !== b && i !== p && sees(i, a) && sees(i, b) && s.eliminate(i, z)) {
            progress = true;
          }
        }
        if (progress) return true;
      }
    }
  }
  return false;
}

/** XYZ-wing: pivot {x,y,z}, pincers {x,z} och {y,z}. z tas bort där alla tre syns. */
function xyzWing(s: LogicState): boolean {
  for (let p = 0; p < CELLS; p++) {
    const cp = s.cand[p]!;
    if (popcount(cp) !== 3) continue;
    const pincers = PEERS[p]!.filter((i) => popcount(s.cand[i]!) === 2 && (s.cand[i]! & ~cp) === 0);
    for (const [a, b] of combinations(pincers, 2)) {
      const ca = s.cand[a!]!;
      const cb = s.cand[b!]!;
      if (ca === cb) continue;
      const z = ca & cb;
      let progress = false;
      for (let i = 0; i < CELLS; i++) {
        if (i !== p && i !== a && i !== b && sees(i, p) && sees(i, a!) && sees(i, b!)) {
          if (s.eliminate(i, z)) progress = true;
        }
      }
      if (progress) return true;
    }
  }
  return false;
}

/** Enkel färgning: kedjor av konjugerade par för en siffra, med reglerna "color wrap" och "color trap". */
function simpleColoring(s: LogicState): boolean {
  for (let d = 1; d <= 9; d++) {
    const m = bit(d);
    const links = new Map<number, number[]>();
    for (const unit of UNITS) {
      const pos = s.positions(unit, d);
      if (pos.length !== 2) continue;
      const [a, b] = pos as [number, number];
      links.set(a, [...(links.get(a) ?? []), b]);
      links.set(b, [...(links.get(b) ?? []), a]);
    }
    const color = new Map<number, 0 | 1>();
    for (const start of links.keys()) {
      if (color.has(start)) continue;
      const comp: number[] = [start];
      color.set(start, 0);
      for (let q = 0; q < comp.length; q++) {
        const cur = comp[q]!;
        for (const nb of links.get(cur)!) {
          if (!color.has(nb)) {
            color.set(nb, color.get(cur) === 0 ? 1 : 0);
            comp.push(nb);
          }
        }
      }
      if (comp.length < 3) continue;
      const groups: [number[], number[]] = [[], []];
      for (const c of comp) groups[color.get(c)!].push(c);
      // Color wrap: två celler med samma färg ser varandra, så den färgen är falsk.
      for (const g of groups) {
        const clash = g.some((a, i) => g.some((b, j) => j > i && sees(a, b)));
        if (clash) {
          let progress = false;
          for (const c of g) if (s.eliminate(c, m)) progress = true;
          if (progress) return true;
        }
      }
      // Color trap: en cell utanför kedjan som ser båda färgerna kan inte vara d.
      const inComp = new Set(comp);
      let progress = false;
      for (let i = 0; i < CELLS; i++) {
        if (inComp.has(i) || !(s.cand[i]! & m)) continue;
        if (groups[0].some((c) => sees(i, c)) && groups[1].some((c) => sees(i, c))) {
          if (s.eliminate(i, m)) progress = true;
        }
      }
      if (progress) return true;
    }
  }
  return false;
}

// ---- Gradering ----------------------------------------------------------

interface Step {
  name: Technique;
  level: Level;
  apply: (s: LogicState) => boolean;
}

/** I stigande svårighetsgrad. Efter varje framsteg börjar vi om från den enklaste. */
export const TECHNIQUES: readonly Step[] = [
  { name: 'hiddenSingle', level: 1, apply: hiddenSingle },
  { name: 'nakedSingle', level: 1, apply: nakedSingle },
  { name: 'pointing', level: 2, apply: pointing },
  { name: 'claiming', level: 2, apply: claiming },
  { name: 'nakedPair', level: 2, apply: (s) => nakedSubset(s, 2) },
  { name: 'hiddenPair', level: 2, apply: (s) => hiddenSubset(s, 2) },
  { name: 'nakedTriple', level: 3, apply: (s) => nakedSubset(s, 3) },
  { name: 'hiddenTriple', level: 3, apply: (s) => hiddenSubset(s, 3) },
  { name: 'xWing', level: 4, apply: (s) => fish(s, 2) },
  { name: 'swordfish', level: 4, apply: (s) => fish(s, 3) },
  { name: 'xyWing', level: 4, apply: xyWing },
  { name: 'nakedQuad', level: 5, apply: (s) => nakedSubset(s, 4) },
  { name: 'hiddenQuad', level: 5, apply: (s) => hiddenSubset(s, 4) },
  { name: 'jellyfish', level: 5, apply: (s) => fish(s, 4) },
  { name: 'xyzWing', level: 5, apply: xyzWing },
  { name: 'simpleColoring', level: 5, apply: simpleColoring },
];

/** Används i tester: kastar fel om en teknik har placerat fel siffra eller tagit bort rätt kandidat. */
function verifyState(s: LogicState, solution: Grid, technique: Technique): void {
  for (let i = 0; i < CELLS; i++) {
    const v = s.values[i]!;
    const ok = v ? v === solution[i] : (s.cand[i]! & bit(solution[i]!)) !== 0;
    if (!ok) throw new Error(`${technique} gav fel resultat i cell ${i}`);
  }
}

/**
 * Löser pusslet logiskt med tekniker upp till och med `maxLevel`.
 * Förutsätter att pusslet har en unik lösning.
 */
export function grade(
  puzzle: Grid,
  maxLevel: Level = 5,
  options: { verifyAgainst?: Grid } = {},
): GradeResult {
  const s = new LogicState(puzzle);
  const check = options.verifyAgainst;
  const usage: Partial<Record<Technique, number>> = {};
  let level: Level | 0 = 0;
  while (!s.solved) {
    let progressed = false;
    for (const t of TECHNIQUES) {
      if (t.level > maxLevel) break;
      if (t.apply(s)) {
        usage[t.name] = (usage[t.name] ?? 0) + 1;
        if (check) verifyState(s, check, t.name);
        if (t.level > level) level = t.level;
        progressed = true;
        break;
      }
    }
    if (!progressed) break;
  }
  return { solved: s.solved, level, usage, grid: s.values.slice() };
}

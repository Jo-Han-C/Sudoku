/** Brädet lagras som 81 celler, index 0–80, rad för rad. */
export const SIZE = 9;
export const CELLS = SIZE * SIZE;

export const rowOf = (i: number): number => Math.floor(i / SIZE);
export const colOf = (i: number): number => i % SIZE;
export const boxOf = (i: number): number => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

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

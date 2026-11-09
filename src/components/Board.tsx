import { boxOf, colOf, rowOf } from '../engine/board';
import { hasNote, isGiven, isWrong } from '../game/selectors';
import type { GameState } from '../game/types';
import { dispatch, settings } from '../state/store';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function Board({ game: g }: { game: GameState }) {
  const { highlightPeers, highlightSameDigit } = settings.value;
  const sel = g.selected;
  const selValue = sel !== null && !isWrong(g, sel) ? g.values[sel]! : 0;

  return (
    <div class="board" role="grid" aria-label="Sudokubräde">
      {g.values.map((value, i) => {
        const peer =
          highlightPeers &&
          sel !== null &&
          i !== sel &&
          (rowOf(i) === rowOf(sel) || colOf(i) === colOf(sel) || boxOf(i) === boxOf(sel));
        const same = highlightSameDigit && selValue !== 0 && value === selValue;
        const cls = [
          'cell',
          isGiven(g, i) ? 'given' : value ? (isWrong(g, i) ? 'wrong' : 'user') : 'empty',
          i === sel && 'selected',
          same && 'same',
          peer && 'peer',
          colOf(i) % 3 === 2 && colOf(i) < 8 && 'edge-r',
          rowOf(i) % 3 === 2 && rowOf(i) < 8 && 'edge-b',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={i}
            type="button"
            role="gridcell"
            class={cls}
            aria-label={`Rad ${rowOf(i) + 1}, kolumn ${colOf(i) + 1}${value ? `, ${value}` : ', tom'}`}
            aria-selected={i === sel}
            onPointerDown={(e) => {
              e.preventDefault();
              dispatch({ type: 'select', cell: i });
            }}
          >
            {value ? (
              <span class="digit">{value}</span>
            ) : g.notes[i] ? (
              <span class="notes">
                {DIGITS.map((d) => (
                  <span key={d} class={d === selValue && highlightSameDigit ? 'note hl' : 'note'}>
                    {hasNote(g, i, d) ? d : ''}
                  </span>
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

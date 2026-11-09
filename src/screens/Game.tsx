import { useEffect } from 'preact/hooks';
import { Board } from '../components/Board';
import { Dialog } from '../components/Dialog';
import { ActionBar, InfoRow, NumberPad, TopBar } from '../components/GameControls';
import { PlayIcon } from '../components/icons';
import { DIFFICULTY_LABEL } from '../engine/difficulty';
import { formatTime } from '../game/selectors';
import type { GameState } from '../game/types';
import {
  dispatch,
  game,
  lastWinWasRecord,
  leaveGame,
  retrySamePuzzle,
  startNewGame,
  stats,
} from '../state/store';

function onKey(e: KeyboardEvent): void {
  if (e.altKey || e.metaKey) return;
  if (e.ctrlKey) {
    if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      dispatch({ type: 'undo' });
    }
    return;
  }
  const arrows: Record<string, 'up' | 'down' | 'left' | 'right'> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
  };
  if (/^[1-9]$/.test(e.key)) dispatch({ type: 'input', digit: Number(e.key) });
  else if (['Backspace', 'Delete', '0'].includes(e.key)) dispatch({ type: 'erase' });
  else if (e.key in arrows) dispatch({ type: 'moveSelection', dir: arrows[e.key]! });
  else if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'p') {
    dispatch({ type: 'togglePencil' });
  } else return;
  e.preventDefault();
}

function EndDialog({ game: g }: { game: GameState }) {
  if (g.status === 'won') {
    const s = stats.value.byDifficulty[g.difficulty];
    return (
      <Dialog
        title="Snyggt löst!"
        buttons={[
          { label: 'Till start', onClick: leaveGame },
          { label: 'Nytt spel', primary: true, onClick: () => void startNewGame(g.difficulty) },
        ]}
      >
        <dl class="result">
          <dt>Nivå</dt>
          <dd>{DIFFICULTY_LABEL[g.difficulty]}</dd>
          <dt>Tid</dt>
          <dd>
            {formatTime(g.elapsedMs)}
            {lastWinWasRecord.value && <span class="record"> Nytt rekord!</span>}
          </dd>
          <dt>Misstag</dt>
          <dd>{g.mistakes}</dd>
          <dt>Vinstrad</dt>
          <dd>{s.currentStreak}</dd>
        </dl>
      </Dialog>
    );
  }
  if (g.status === 'lost') {
    return (
      <Dialog
        title="Tre misstag"
        buttons={[
          { label: 'Till start', onClick: leaveGame },
          { label: 'Försök igen', onClick: retrySamePuzzle },
          { label: 'Nytt spel', primary: true, onClick: () => void startNewGame(g.difficulty) },
        ]}
      >
        Spelet är slut. Försök igen med samma pussel eller börja på ett nytt.
      </Dialog>
    );
  }
  return null;
}

export function GameScreen() {
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const g = game.value;
  if (!g) return null;
  const paused = g.status === 'paused';

  return (
    <div class="game">
      <TopBar game={g} />
      <InfoRow game={g} />
      <div class="board-wrap">
        <Board game={g} />
        {paused && (
          <div class="pause-overlay">
            <p>Pausad</p>
            <button
              type="button"
              class="play-big"
              aria-label="Fortsätt"
              onClick={() => dispatch({ type: 'resume' })}
            >
              <PlayIcon width={40} height={40} />
            </button>
          </div>
        )}
      </div>
      <ActionBar game={g} />
      <NumberPad game={g} />
      <EndDialog game={g} />
    </div>
  );
}

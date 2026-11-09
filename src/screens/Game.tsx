import { useEffect, useState } from 'preact/hooks';
import { Board } from '../components/Board';
import { Dialog } from '../components/Dialog';
import {
  ActionBar,
  AutoCompleteSwitch,
  InfoRow,
  NumberPad,
  TopBar,
} from '../components/GameControls';
import { PlayIcon } from '../components/icons';
import { DIFFICULTY_LABEL } from '../engine/difficulty';
import { formatTime } from '../game/selectors';
import type { GameState } from '../game/types';
import {
  dispatch,
  game,
  goBack,
  lastWinWasRecord,
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
  // Vid autokomplettering visas dialogen först när siffrorna har fyllts i.
  const delay = g.autoFilled ? g.autoFilled.length * 70 + 600 : 0;
  const [visible, setVisible] = useState(delay === 0);
  useEffect(() => {
    if (delay === 0) return;
    const id = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(id);
  }, [delay]);
  if (!visible) return null;

  const newGame = {
    label: 'Nytt spel',
    primary: true,
    onClick: () => void startNewGame(g.difficulty),
  };
  const home = { label: 'Till start', onClick: goBack };

  if (g.status === 'won') {
    const s = stats.value.byDifficulty[g.difficulty];
    return (
      <Dialog title="Snyggt löst!" buttons={[home, newGame]}>
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
  if (g.status === 'lost' && g.givenUp) {
    // Ett kort längst ned, så att lösningen på brädet syns.
    return (
      <div class="end-card" role="status">
        <p>Du gav upp. Lösningen visas, och siffrorna du inte hann fylla i är gråa.</p>
        <div class="dialog-buttons">
          <button type="button" class="btn" onClick={home.onClick}>
            {home.label}
          </button>
          <button type="button" class="btn primary" onClick={newGame.onClick}>
            {newGame.label}
          </button>
        </div>
      </div>
    );
  }
  if (g.status === 'lost') {
    return (
      <Dialog
        title="Tre misstag"
        buttons={[home, { label: 'Försök igen', onClick: retrySamePuzzle }, newGame]}
      >
        Spelet är slut. Försök igen med samma pussel eller börja på ett nytt.
      </Dialog>
    );
  }
  return null;
}

function PauseOverlay() {
  const [confirming, setConfirming] = useState(false);
  return (
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
      <button type="button" class="btn ghost" onClick={() => setConfirming(true)}>
        Ge upp
      </button>
      {confirming && (
        <Dialog
          title="Ge upp spelet?"
          onClose={() => setConfirming(false)}
          buttons={[
            { label: 'Avbryt', onClick: () => setConfirming(false) },
            { label: 'Ge upp', primary: true, onClick: () => dispatch({ type: 'giveUp' }) },
          ]}
        >
          Spelet räknas som förlorat och vinstraden nollställs. Lösningen visas efteråt.
        </Dialog>
      )}
    </div>
  );
}

export function GameScreen() {
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const g = game.value;
  if (!g) return null;
  const ended = g.status === 'won' || g.status === 'lost';

  return (
    <div class="game">
      <TopBar game={g} />
      <InfoRow game={g} />
      <div class="board-wrap">
        <Board game={g} />
        {g.status === 'paused' && <PauseOverlay />}
      </div>
      <AutoCompleteSwitch />
      <ActionBar game={g} />
      <NumberPad game={g} />
      {ended && <EndDialog key={`${g.id}-${g.status}`} game={g} />}
    </div>
  );
}

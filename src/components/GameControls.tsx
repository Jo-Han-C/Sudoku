import { DIFFICULTY_LABEL } from '../engine/difficulty';
import { elapsedAt, formatTime, progress, remainingDigits } from '../game/selectors';
import { MAX_MISTAKES, type GameState } from '../game/types';
import { dispatch, goBack, navigate, now, settings, stats } from '../state/store';
import { BackIcon, EraseIcon, GearIcon, PauseIcon, PencilIcon, PlayIcon, UndoIcon } from './icons';

export function TopBar({ game: g }: { game: GameState }) {
  const streak = stats.value.byDifficulty[g.difficulty].currentStreak;
  return (
    <header class="topbar">
      <button type="button" class="icon-btn" aria-label="Tillbaka" onClick={goBack}>
        <BackIcon width={28} height={28} />
      </button>
      <h1 class="topbar-title">
        Vinstrad <span class="accent">{streak}</span>
      </h1>
      <button
        type="button"
        class="icon-btn topbar-end"
        aria-label="Inställningar"
        onClick={() => navigate('settings')}
      >
        <GearIcon width={28} height={28} />
      </button>
    </header>
  );
}

function Timer({ game: g }: { game: GameState }) {
  return <span class="timer">{formatTime(elapsedAt(g, now.value))}</span>;
}

export function InfoRow({ game: g }: { game: GameState }) {
  const { filled, total } = progress(g);
  const limit = settings.value.mistakeLimit;
  const canPause = g.status === 'playing' || g.status === 'paused';
  return (
    <div class="info">
      <div class="info-left">
        <span class="progress">
          {filled}/{total}
        </span>
        <span class={g.mistakes > 0 ? 'mistakes has' : 'mistakes'}>
          Misstag: {g.mistakes}
          {limit ? `/${MAX_MISTAKES}` : ''}
        </span>
      </div>
      <div class="info-mid">{DIFFICULTY_LABEL[g.difficulty]}</div>
      <div class="info-right">
        {settings.value.showTimer && <Timer game={g} />}
        {canPause && (
          <button
            type="button"
            class="icon-btn pause-btn"
            aria-label={g.status === 'paused' ? 'Fortsätt' : 'Pausa'}
            onClick={() => dispatch({ type: g.status === 'paused' ? 'resume' : 'pause' })}
          >
            {g.status === 'paused' ? <PlayIcon /> : <PauseIcon />}
          </button>
        )}
      </div>
    </div>
  );
}

export function ActionBar({ game: g }: { game: GameState }) {
  const disabled = g.status !== 'playing';
  return (
    <div class="actions">
      <button
        type="button"
        class="action"
        disabled={disabled || g.history.length === 0}
        onClick={() => dispatch({ type: 'undo' })}
      >
        <UndoIcon width={30} height={30} />
        <span>Ångra</span>
      </button>
      <button
        type="button"
        class="action"
        disabled={disabled}
        onClick={() => dispatch({ type: 'erase' })}
      >
        <EraseIcon width={30} height={30} />
        <span>Radera</span>
      </button>
      <button
        type="button"
        class={g.pencil ? 'action on' : 'action'}
        disabled={disabled}
        aria-pressed={g.pencil}
        onClick={() => dispatch({ type: 'togglePencil' })}
      >
        <span class="badge">{g.pencil ? 'PÅ' : 'AV'}</span>
        <PencilIcon width={30} height={30} />
        <span>Penna</span>
      </button>
    </div>
  );
}

export function NumberPad({ game: g }: { game: GameState }) {
  const remaining = remainingDigits(g);
  const hide = settings.value.hideCompletedDigits;
  const disabled = g.status !== 'playing';
  return (
    <div class={g.pencil ? 'numpad pencil' : 'numpad'}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
        const left = remaining[d]!;
        const done = left === 0;
        return (
          <button
            key={d}
            type="button"
            class={done ? 'num done' : 'num'}
            style={done && hide ? { visibility: 'hidden' } : undefined}
            disabled={disabled}
            aria-label={`${d}, ${left} kvar`}
            onPointerDown={(e) => {
              e.preventDefault();
              dispatch({ type: 'input', digit: d });
            }}
          >
            <span class="num-digit">{d}</span>
            <span class="num-left">{left}</span>
          </button>
        );
      })}
    </div>
  );
}

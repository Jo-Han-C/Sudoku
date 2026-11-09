import { useState } from 'preact/hooks';
import { ChartIcon, GearIcon } from '../components/icons';
import { NewGameFlow } from '../components/NewGameFlow';
import { DIFFICULTY_LABEL } from '../engine/difficulty';
import { elapsedAt, formatTime, progress } from '../game/selectors';
import { continueGame, loading, navigate, now, resumableGame } from '../state/store';

export function HomeScreen() {
  const [picking, setPicking] = useState(false);
  const g = resumableGame.value;

  return (
    <div class="home">
      <header class="home-bar">
        <button
          type="button"
          class="icon-btn"
          aria-label="Statistik"
          onClick={() => navigate('stats')}
        >
          <ChartIcon width={28} height={28} />
        </button>
        <button
          type="button"
          class="icon-btn"
          aria-label="Inställningar"
          onClick={() => navigate('settings')}
        >
          <GearIcon width={28} height={28} />
        </button>
      </header>

      <div class="home-hero">
        <div class="logo" aria-hidden="true">
          {[5, 3, 0, 0, 7, 0, 6, 0, 0].map((d, i) => (
            <span key={i}>{d || ''}</span>
          ))}
        </div>
        <h1>Sudoku</h1>
      </div>

      <div class="home-actions">
        {g && (
          <button type="button" class="continue" onClick={continueGame}>
            <span class="continue-title">Fortsätt</span>
            <span class="continue-meta">
              {DIFFICULTY_LABEL[g.difficulty]} · {formatTime(elapsedAt(g, now.value))} ·{' '}
              {progress(g).filled}/{progress(g).total}
            </span>
          </button>
        )}
        <button
          type="button"
          class={g ? 'btn big' : 'btn big primary'}
          disabled={loading.value}
          onClick={() => setPicking(true)}
        >
          Nytt spel
        </button>
        <button type="button" class="btn big ghost" onClick={() => navigate('stats')}>
          Statistik
        </button>
      </div>

      {picking && <NewGameFlow onClose={() => setPicking(false)} />}
    </div>
  );
}

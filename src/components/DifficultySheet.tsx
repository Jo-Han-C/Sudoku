import { DIFFICULTIES, DIFFICULTY_LABEL, type Difficulty } from '../engine/difficulty';
import { settings } from '../state/store';

const DESCRIPTION: Record<Difficulty, string> = {
  easy: 'Många ledtrådar, bara enkla tekniker',
  medium: 'Färre ledtrådar',
  hard: 'Kräver par och låsta kandidater',
  expert: 'X-wing, Swordfish och XY-wing',
  master: 'De tyngsta teknikerna',
};

export function DifficultySheet(props: { onPick: (d: Difficulty) => void; onClose: () => void }) {
  return (
    <div class="scrim sheet-scrim" onClick={props.onClose}>
      <div
        class="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Välj svårighetsgrad"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Nytt spel</h2>
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            class={d === settings.value.lastDifficulty ? 'level current' : 'level'}
            onClick={() => props.onPick(d)}
          >
            <span class="level-name">{DIFFICULTY_LABEL[d]}</span>
            <span class="level-desc">{DESCRIPTION[d]}</span>
          </button>
        ))}
        <button type="button" class="btn sheet-cancel" onClick={props.onClose}>
          Avbryt
        </button>
      </div>
    </div>
  );
}

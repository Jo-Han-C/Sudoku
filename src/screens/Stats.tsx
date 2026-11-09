import { useState } from 'preact/hooks';
import { ScreenHeader } from '../components/ScreenHeader';
import { DIFFICULTIES, DIFFICULTY_LABEL, type Difficulty } from '../engine/difficulty';
import { formatTime } from '../game/selectors';
import { averageTimeMs, totals, winRate, type DifficultyStats } from '../stats/stats';
import { settings, stats } from '../state/store';

type Tab = Difficulty | 'total';

const pct = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)} %`);
const time = (v: number | null) => (v === null ? '–' : formatTime(v));

function Tile(props: { label: string; value: string | number; wide?: boolean }) {
  return (
    <div class={props.wide ? 'tile wide' : 'tile'}>
      <span class="tile-value">{props.value}</span>
      <span class="tile-label">{props.label}</span>
    </div>
  );
}

function StatsGrid({ s, total }: { s: DifficultyStats; total: boolean }) {
  return (
    <>
      <h2 class="stats-group">Spel</h2>
      <div class="tiles">
        <Tile label="Startade" value={s.started} />
        <Tile label="Vunna" value={s.won} />
        <Tile label="Vinstprocent" value={pct(winRate(s))} />
        <Tile label="Vinster utan misstag" value={s.wonNoMistakes} />
        <Tile label="Förlorade" value={s.lost} />
        <Tile label="Varav uppgivna" value={s.givenUp} />
      </div>
      <h2 class="stats-group">Tid</h2>
      <div class="tiles">
        <Tile label="Bästa tid" value={time(s.bestTimeMs)} />
        <Tile label="Snittid" value={time(averageTimeMs(s))} />
      </div>
      <h2 class="stats-group">Vinstrad</h2>
      <div class="tiles">
        <Tile label={total ? 'Längsta pågående' : 'Nuvarande'} value={s.currentStreak} />
        <Tile label="Bästa" value={s.bestStreak} />
      </div>
    </>
  );
}

export function StatsScreen() {
  const [tab, setTab] = useState<Tab>(settings.value.lastDifficulty);
  const s = tab === 'total' ? totals(stats.value) : stats.value.byDifficulty[tab];
  const tabs: Tab[] = [...DIFFICULTIES, 'total'];

  return (
    <div class="page">
      <ScreenHeader title="Statistik" />
      <div class="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={t === tab}
            class={t === tab ? 'tab on' : 'tab'}
            onClick={() => setTab(t)}
          >
            {t === 'total' ? 'Totalt' : DIFFICULTY_LABEL[t]}
          </button>
        ))}
      </div>
      <StatsGrid s={s} total={tab === 'total'} />
    </div>
  );
}

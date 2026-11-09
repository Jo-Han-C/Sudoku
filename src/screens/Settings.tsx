import { useState } from 'preact/hooks';
import { Dialog } from '../components/Dialog';
import { ScreenHeader } from '../components/ScreenHeader';
import { Switch } from '../components/Switch';
import type { Settings } from '../game/settings';
import { resetStats, settings, updateSettings } from '../state/store';

type BoolKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

const ROWS: { key: BoolKey; label: string; desc: string }[] = [
  { key: 'mistakeLimit', label: 'Misstagsgräns', desc: 'Tre misstag avslutar spelet' },
  {
    key: 'autoComplete',
    label: 'Autokomplettering',
    desc: 'Fyll i resten när varje tom cell bara har en möjlig siffra',
  },
  {
    key: 'autoRemoveNotes',
    label: 'Ta bort anteckningar automatiskt',
    desc: 'När en rätt siffra placeras försvinner den ur anteckningarna i rad, kolumn och box',
  },
  {
    key: 'highlightPeers',
    label: 'Markera rad, kolumn och box',
    desc: 'För den markerade cellen',
  },
  { key: 'highlightSameDigit', label: 'Markera samma siffra', desc: 'Även i anteckningar' },
  {
    key: 'hideCompletedDigits',
    label: 'Dölj färdiga siffror',
    desc: 'Siffror som är placerade nio gånger döljs i sifferfältet',
  },
  { key: 'showTimer', label: 'Visa timer', desc: 'Tiden räknas ändå för statistiken' },
  { key: 'haptics', label: 'Vibrera vid misstag', desc: 'Om telefonen stöder det' },
  {
    key: 'keepScreenOn',
    label: 'Håll skärmen tänd',
    desc: 'Skärmen släcks inte medan du spelar',
  },
];

export function SettingsScreen() {
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  return (
    <div class="page">
      <ScreenHeader title="Inställningar" />
      <ul class="settings">
        {ROWS.map((r) => (
          <li key={r.key} class="setting">
            <div class="setting-text">
              <span class="setting-label">{r.label}</span>
              <span class="setting-desc">{r.desc}</span>
            </div>
            <Switch
              label={r.label}
              checked={settings.value[r.key]}
              onChange={(v) => updateSettings({ [r.key]: v })}
            />
          </li>
        ))}
      </ul>

      <button type="button" class="btn danger" onClick={() => setConfirmReset(true)}>
        {resetDone ? 'Statistiken är nollställd' : 'Nollställ statistik'}
      </button>
      <p class="version">Sudoku {__APP_VERSION__}</p>

      {confirmReset && (
        <Dialog
          title="Nollställa statistiken?"
          onClose={() => setConfirmReset(false)}
          buttons={[
            { label: 'Avbryt', onClick: () => setConfirmReset(false) },
            {
              label: 'Nollställ',
              primary: true,
              onClick: () => {
                resetStats();
                setResetDone(true);
                setConfirmReset(false);
              },
            },
          ]}
        >
          All statistik för alla nivåer raderas, även vinstraderna. Det går inte att ångra.
        </Dialog>
      )}
    </div>
  );
}

import { useState } from 'preact/hooks';
import type { Difficulty } from '../engine/difficulty';
import { hasStartedGame, startNewGame } from '../state/store';
import { Dialog } from './Dialog';
import { DifficultySheet } from './DifficultySheet';

/** Val av svårighetsgrad, med bekräftelse om ett påbörjat spel då räknas som förlorat. */
export function NewGameFlow(props: { onClose: () => void }) {
  const [pending, setPending] = useState<Difficulty | null>(null);

  const pick = (d: Difficulty) => {
    if (hasStartedGame.value) setPending(d);
    else void startNewGame(d).then(props.onClose);
  };

  if (pending) {
    return (
      <Dialog
        title="Avsluta pågående spel?"
        onClose={props.onClose}
        buttons={[
          { label: 'Avbryt', onClick: props.onClose },
          {
            label: 'Starta nytt',
            primary: true,
            onClick: () => void startNewGame(pending).then(props.onClose),
          },
        ]}
      >
        Spelet du har påbörjat räknas som förlorat och vinstraden nollställs.
      </Dialog>
    );
  }
  return <DifficultySheet onPick={pick} onClose={props.onClose} />;
}

import { goBack } from '../state/store';
import { BackIcon } from './icons';

export function ScreenHeader({ title }: { title: string }) {
  return (
    <header class="screen-header">
      <button type="button" class="icon-btn" aria-label="Tillbaka" onClick={goBack}>
        <BackIcon width={28} height={28} />
      </button>
      <h1>{title}</h1>
    </header>
  );
}

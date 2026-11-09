import { useEffect } from 'preact/hooks';
import { applyUpdate, needRefresh, offlineReady } from '../pwa/pwa';
import { prepareForReload } from '../state/store';

export function Toasts() {
  useEffect(() => {
    if (!offlineReady.value) return;
    const id = window.setTimeout(() => (offlineReady.value = false), 4000);
    return () => window.clearTimeout(id);
  }, [offlineReady.value]);

  if (needRefresh.value) {
    return (
      <div class="toast" role="status">
        <span>En ny version finns.</span>
        <div class="toast-actions">
          <button type="button" class="btn ghost" onClick={() => (needRefresh.value = false)}>
            Senare
          </button>
          <button
            type="button"
            class="btn primary"
            onClick={() => {
              prepareForReload();
              void applyUpdate();
            }}
          >
            Uppdatera
          </button>
        </div>
      </div>
    );
  }
  if (offlineReady.value) {
    return (
      <div class="toast" role="status">
        <span>Appen fungerar nu även utan internet.</span>
      </div>
    );
  }
  return null;
}

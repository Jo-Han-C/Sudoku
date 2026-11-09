import { signal } from '@preact/signals';
import { registerSW } from 'virtual:pwa-register';

/** En ny version är nedladdad och väntar på att användaren ska uppdatera. */
export const needRefresh = signal(false);
/** Appen har precis sparats för offlinebruk (första besöket). */
export const offlineReady = signal(false);

let updateServiceWorker: ((reload?: boolean) => Promise<void>) | null = null;

export function initPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh: () => (needRefresh.value = true),
    onOfflineReady: () => (offlineReady.value = true),
  });
  // Be webbläsaren att inte rensa sparade spel och statistik vid ont om utrymme.
  void navigator.storage?.persist?.().catch(() => undefined);
}

/** Installerar den nya versionen och laddar om. Spelet ska sparas innan detta anropas. */
export async function applyUpdate(): Promise<void> {
  needRefresh.value = false;
  // Laddar om när den nya versionen tagit över. Som reserv laddas sidan om ändå.
  window.setTimeout(() => location.reload(), 3000);
  if (updateServiceWorker) await updateServiceWorker(true);
  else location.reload();
}

/**
 * Renderar appikonerna till PNG i public/icons med Chromium (Playwright).
 *
 *   npx tsx scripts/generate-icons.ts
 *
 * Kräver en Chromium som Playwright hittar. Ikonerna checkas in, så skriptet
 * behöver bara köras när utseendet ändras.
 */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { iconSvg } from './icon.svg';

const out = (name: string) => new URL(`../public/icons/${name}`, import.meta.url);

const targets = [
  { name: 'icon-192.png', size: 192, opts: {} },
  { name: 'icon-512.png', size: 512, opts: {} },
  { name: 'maskable-512.png', size: 512, opts: { safe: 0.62, rounded: false } },
  { name: 'apple-touch-icon.png', size: 180, opts: { safe: 0.72, rounded: false } },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}</style>${iconSvg(t.size, t.opts)}`,
  );
  await page.waitForTimeout(100);
  await page.screenshot({ path: out(t.name).pathname, omitBackground: true });
  console.log('skrev', t.name);
}
writeFileSync(out('icon.svg'), iconSvg(512));
await browser.close();

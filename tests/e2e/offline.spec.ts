import { expect, test } from '@playwright/test';
import { startGame } from './helpers';

test('appen har ett manifest för installation', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({
    display: 'standalone',
    start_url: '/Sudoku/',
    scope: '/Sudoku/',
  });
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
});

test('fungerar offline, även nya spel på alla nivåer', async ({ page, context }) => {
  await page.goto('./');
  // Vänta tills service workern är installerad och styr sidan.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sudoku' })).toBeVisible();

  for (const level of ['Lätt', 'Medel', 'Svår', 'Expert', 'Mästare']) {
    const g = await startGame(page, level);
    expect(g.givens).toMatch(/^[0-9]{81}$/);
    await page.getByRole('button', { name: 'Tillbaka' }).click();
  }
});

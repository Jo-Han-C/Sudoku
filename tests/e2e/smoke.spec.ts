import { expect, test } from '@playwright/test';
import { emptyCells, enter, readGame, startGame } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('spelar ett lätt pussel till vinst och statistiken uppdateras', async ({ page }) => {
  const g = await startGame(page, 'Lätt');
  for (const i of emptyCells(g)) {
    const offer = page.getByRole('dialog', { name: 'Fyll i resten automatiskt?' });
    if (await offer.isVisible()) {
      await offer.getByRole('button', { name: 'Ja, fyll i' }).click();
      break;
    }
    await enter(page, i, Number(g.solution[i]));
  }
  await expect(page.getByRole('dialog', { name: 'Snyggt löst!' })).toBeVisible();
  await expect(page.locator('.topbar-title')).toHaveText('Vinstrad 1');

  await page.getByRole('button', { name: 'Till start' }).click();
  await page.getByRole('button', { name: 'Statistik' }).click();
  await expect(page.locator('.tile', { hasText: 'Vunna' })).toContainText('1');
  await expect(page.locator('.tile', { hasText: 'Vinstprocent' })).toContainText('100 %');
});

test('tre misstag ger förlust', async ({ page }) => {
  const g = await startGame(page, 'Medel');
  const cell = emptyCells(g)[0]!;
  const wrong = (Number(g.solution[cell]) % 9) + 1;
  for (let k = 0; k < 3; k++) {
    await enter(page, cell, wrong);
    if (k < 2) await page.getByRole('button', { name: 'Radera' }).click();
  }
  await expect(page.getByRole('dialog', { name: 'Tre misstag' })).toBeVisible();
});

test('ett pausat spel sparas och kan fortsättas efter omladdning', async ({ page }) => {
  const g = await startGame(page, 'Svår');
  const cell = emptyCells(g)[0]!;
  await enter(page, cell, Number(g.solution[cell]));
  await page.getByRole('button', { name: 'Pausa' }).click();
  await expect(page.locator('.pause-overlay')).toBeVisible();

  await page.reload();
  const cont = page.getByRole('button', { name: /^Fortsätt/ });
  await expect(cont).toContainText('Svår');
  await expect(cont).toContainText(`1/${emptyCells(g).length}`);
  await cont.click();
  await expect(page.locator('.cell').nth(cell)).toHaveText(g.solution[cell]!);
  expect((await readGame(page)).status).toBe('playing');
});

test('bakåt från spelet pausar och visar startskärmen', async ({ page }) => {
  await startGame(page, 'Lätt');
  await page.goBack();
  await expect(page.getByRole('button', { name: /^Fortsätt/ })).toBeVisible();
  expect((await readGame(page)).status).toBe('paused');
});

test('ge upp visar lösningen och räknas som uppgivet', async ({ page }) => {
  const g = await startGame(page, 'Expert');
  const cell = emptyCells(g)[0]!;
  await enter(page, cell, Number(g.solution[cell]));
  await page.getByRole('button', { name: 'Pausa' }).click();
  await page.getByRole('button', { name: 'Ge upp' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ge upp' }).click();
  await expect(page.locator('.end-card')).toContainText('Du gav upp');
  const after = await readGame(page);
  expect(after.givenUp).toBe(true);
  expect(after.values.join('')).toBe(g.solution);

  await page.getByRole('button', { name: 'Till start' }).click();
  await page.getByRole('button', { name: 'Statistik' }).click();
  await page.getByRole('tab', { name: 'Expert' }).click();
  await expect(page.locator('.tile', { hasText: 'Varav uppgivna' })).toContainText('1');
});

test('autofyll frågar först och frågar inte igen efter nej', async ({ page }) => {
  const g = await startGame(page, 'Lätt');
  const offer = page.getByRole('dialog', { name: 'Fyll i resten automatiskt?' });
  const cells = emptyCells(g);
  let k = 0;
  while (!(await offer.isVisible())) {
    await enter(page, cells[k]!, Number(g.solution[cells[k]!]));
    k++;
  }
  await offer.getByRole('button', { name: 'Nej, jag fyller i själv' }).click();
  await enter(page, cells[k]!, Number(g.solution[cells[k]!]));
  await expect(offer).toBeHidden();
  expect((await readGame(page)).status).toBe('playing');
});

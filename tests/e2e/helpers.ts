import { expect, type Page } from '@playwright/test';

export interface StoredGame {
  givens: string;
  solution: string;
  values: number[];
  status: string;
  givenUp?: boolean;
}

export const readGame = (page: Page): Promise<StoredGame> =>
  page.evaluate(() => JSON.parse(localStorage.getItem('sudoku:v1:game') ?? 'null'));

export async function startGame(page: Page, level: string): Promise<StoredGame> {
  await page.getByRole('button', { name: 'Nytt spel' }).click();
  await page.getByRole('button', { name: new RegExp(`^${level}`) }).click();
  await expect(page.locator('.board')).toBeVisible();
  return readGame(page);
}

export const emptyCells = (g: StoredGame): number[] =>
  [...g.givens].map((c, i) => (c === '0' ? i : -1)).filter((i) => i >= 0);

/** Väljer en cell och trycker på en siffra i sifferfältet. */
export async function enter(page: Page, cell: number, digit: number): Promise<void> {
  await page.locator('.cell').nth(cell).click();
  await page.getByRole('button', { name: new RegExp(`^${digit}, \\d+ kvar$`) }).click();
}

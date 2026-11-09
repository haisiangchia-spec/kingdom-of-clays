import { test, expect } from '@playwright/test';
test('loads four heroes and four enemies without exceptions', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Kingdom of Clays/i })).toBeVisible();
  await expect(page.locator('#hero .unit')).toHaveCount(4);
  await expect(page.locator('#enemy .unit')).toHaveCount(4);
  await expect(page.locator('#phase')).toContainText('Round 1');
  expect(errors).toEqual([]);
});
test('selects a combat skill and applies it to a legal target', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#actions button:not([disabled])').first()).toBeVisible();
  const initial = await page.locator('#log div').count();
  await page.locator('#actions button:not([disabled])').first().click();
  await expect(page.locator('#actions .targets button').first()).toBeVisible();
  await page.locator('#actions .targets button').first().click();
  await expect.poll(async () => page.locator('#log div').count()).toBeGreaterThan(initial);
});
test('new battle restarts and randomizes seed', async ({ page }) => {
  await page.goto('/');
  const old = await page.locator('#phase').innerText();
  await page.getByRole('button', { name: 'New Battle' }).click();
  await expect(page.locator('#phase')).toContainText('Round 1');
  await expect(page.locator('#hero .unit')).toHaveCount(4);
  expect(await page.locator('#phase').innerText()).not.toEqual(old);
});
test('mobile battle shows working controls', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#hero .unit')).toHaveCount(4);
  await page.locator('#actions button:not([disabled])').first().click();
  await expect(page.locator('#actions .targets button').first()).toBeVisible();
  expect(errors).toEqual([]);
});

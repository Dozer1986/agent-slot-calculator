import { test, expect } from '@playwright/test';

const url = '/agent-slot-calculator/build/';

test('builder sees the model, the fit check and a part’s details', async ({ page }) => {
  await page.goto(url);
  await expect(page.locator('#view canvas')).toBeVisible();
  await expect(page.locator('#no-webgl')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Fit check' })).toBeVisible();
  await expect(page.locator('.pill')).toHaveText('Nothing overlaps');
  await page.getByRole('button', { name: 'Corsair SF1000 Platinum' }).click();
  await expect(page.locator('#part-info')).toContainText('125 × 100 × 63.5 mm');
  await page.getByRole('button', { name: 'Rear', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Corsair SF1000 Platinum' })).toHaveAttribute('aria-pressed', 'true');
});

test('build page has no horizontal scroll at 400px', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(url);
  await expect(page.locator('#view canvas')).toBeVisible();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(wide).toBe(false);
});

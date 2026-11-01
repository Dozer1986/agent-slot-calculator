import { test, expect } from '@playwright/test';

const site = '/agent-slot-calculator/';
const bundle = 'Micro Center bundle · Core Ultra 7 270K Plus · 32 GB';
const priceCell = (page: import('@playwright/test').Page) =>
  page.getByRole('row').filter({ hasText: bundle }).locator('td').nth(1);

test('part and RAM prices on the settings page reprice the bundles and persist', async ({ page }) => {
  await page.goto(site + 'settings/');
  const chassis = page.getByRole('spinbutton', { name: 'Case', exact: true });
  const ddr5 = page.getByRole('spinbutton', { name: 'DDR5 64 GB stick price', exact: true });
  await expect(chassis).toHaveValue('200');
  await expect(ddr5).toHaveValue('926');
  await expect(page.getByRole('spinbutton', { name: 'DDR3 4 GB stick price', exact: true })).toHaveValue('');

  await chassis.fill('300');
  await ddr5.fill('500');
  await page.reload();
  await expect(chassis).toHaveValue('300');
  await expect(ddr5).toHaveValue('500');

  // $1,255 as shipped at defaults: +$100 case. RAM only moves the 128 GB upgrade: 2 × $500.
  await page.getByRole('link', { name: 'Calculator' }).click();
  await page.getByRole('group', { name: 'Machines to show' }).getByRole('button', { name: 'Micro Center bundles' }).click();
  await expect(priceCell(page)).toHaveText('$1,355');
  await page.getByRole('row').filter({ hasText: bundle }).click();
  await expect(page.locator('#flags')).toContainText('With 128 GB (+$1,000)');

  await page.goto(site + 'settings/');
  await page.getByRole('button', { name: 'Reset to defaults' }).click();
  await expect(chassis).toHaveValue('200');
  await page.goto(site);
  await page.getByRole('group', { name: 'Machines to show' }).getByRole('button', { name: 'Micro Center bundles' }).click();
  await expect(priceCell(page)).toHaveText('$1,255');
});

test('the settings page has no horizontal scroll at 400px', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(site + 'settings/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(400);
});

test('a loaded bundle compares the ways to get past its stock memory', async ({ page }) => {
  const row = (label: string) => page.locator('#ram-plans-body tr').filter({ hasText: label });
  await page.goto(site);
  await expect(page.locator('#ram-plans')).toBeHidden();
  await page.getByRole('group', { name: 'Machines to show' }).getByRole('button', { name: 'Micro Center bundles' }).click();
  await page.getByRole('row').filter({ hasText: bundle }).click();
  await expect(page.locator('#ram-plans')).toBeVisible();
  await expect(page.locator('#ram-plans-body tr')).toHaveCount(8);
  await expect(row('2×64 GB · kit sold').locator('td').nth(2)).toHaveText('$1,577');
  await expect(row('Keep 2×16 GB + 2×64 GB').locator('td').nth(1)).toHaveText('160 GB');
  await page.setViewportSize({ width: 400, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.goto(site + 'settings/');
  await page.getByRole('spinbutton', { name: 'Used RAM resale' }).fill('0');
  await page.goto(site);
  await expect(row('2×64 GB · kit sold').locator('td').nth(2)).toHaveText('$1,852');
});

test('the 160 GB 270K Plus build is listed with the report machines', async ({ page }) => {
  await page.goto(site);
  const row = page.getByRole('row').filter({ hasText: 'Core Ultra 7 270K Plus · 160 GB (2×16 + 2×64)' });
  await expect(row.locator('td').nth(1)).toHaveText('$3,107');
  await row.click();
  await expect(page.locator('#ram-plans')).toBeHidden();
});

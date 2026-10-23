import { test, expect } from '@playwright/test';

const site = '/agent-slot-calculator/';

test('hardware buyer gets the report default verdict', async ({ page }) => {
  await page.goto(site);
  await expect(page.locator('#agents')).toHaveText('14');
  await expect(page.locator('#limit')).toHaveText('limited by memory');
  await expect(page.locator('#m-hw')).toHaveText('$214');
  await expect(page.locator('#m-tco')).toHaveText('$305');
  await expect(page.locator('#vpill')).toHaveText('Worth it');
});

test('zero memory per build is rejected without corrupting the verdict', async ({ page }) => {
  await page.goto(site);
  const memory = page.getByRole('spinbutton', { name: 'Memory per running build', exact: true });
  await memory.fill('0');
  await expect(page.locator('#agents')).toHaveText('14');
  await expect(page.locator('#chart')).not.toContainText('Infinity');
  await memory.fill('6');
  await expect(page.locator('#res-assume')).toHaveText('30% duty · 6 GB/build');
});

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

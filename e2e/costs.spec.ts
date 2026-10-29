import { test, expect } from '@playwright/test';

const site = '/agent-slot-calculator/';
const costs = site + 'costs/';

test('hardware buyer compares every machine on the cost chart', async ({ page }) => {
  await page.goto(costs);
  await expect(page.locator('#cost-assume')).toHaveText('30% duty · 12 GB/build · 3 yr · $0.35/kWh');
  // 23 presets, 4 of which hold no agent at the defaults.
  await expect(page.locator('#cost-chart .pt')).toHaveCount(19);
  await expect(page.locator('#cost-none')).toContainText('Lenovo M920q');
  const reference = page.locator('#cost-tbody tr[data-id="270k128"]');
  await expect(reference.locator('td')).toHaveText(['Core Ultra 7 270K Plus · 128 GB (new build)Best at this budget', '$4,272', '14', '$305', '×1.00', 'Worth it']);
  await expect(page.locator('#cost-tbody .tag', { hasText: 'Best at this budget' })).toHaveCount(4);
  await page.getByRole('checkbox', { name: 'Include machines you already own' }).uncheck();
  await expect(page.locator('#cost-chart .pt')).toHaveCount(17);
  await expect(page.locator('#cost-tbody')).not.toContainText('Already yours');
});

test('keyboard and pointer users read a dot through its tooltip', async ({ page }) => {
  await page.goto(costs);
  const dot = page.locator('#cost-chart .pt[data-id="270k128"]');
  await expect(dot).toHaveAttribute('aria-label', /\$305 per agent, 14 agents, \$4,272 over 3 years, Worth it/);
  await dot.focus();
  await expect(page.locator('#cost-tip')).toBeVisible();
  await expect(page.locator('#cost-tip')).toContainText('$305 per agent');
  await expect(page.locator('#cost-tbody tr[data-id="270k128"]')).toHaveClass(/is-hot/);
  await dot.blur();
  await expect(page.locator('#cost-tip')).toBeHidden();
  await page.locator('#cost-chart .pt[data-id="tr9980b"]').hover();
  await expect(page.locator('#cost-tip')).toContainText('35 agents · $17,156 over 3 yr');
});

test('fleet operator settings carry over and a machine opens in the calculator', async ({ page }) => {
  await page.goto(site);
  await page.getByRole('spinbutton', { name: 'Duty cycle', exact: true }).fill('15');
  await page.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Cost chart' }).click();
  await expect(page).toHaveURL(/\/costs\/$/);
  await expect(page.locator('#cost-assume')).toContainText('15% duty');
  await expect(page.locator('#cost-tbody tr[data-id="270k128"] td').nth(2)).toHaveText('26');
  await page.getByRole('link', { name: 'Ryzen 9 9950X · 192 GB (new build)' }).click();
  await expect(page.locator('#preset')).toHaveValue('9950x192');
  await expect(page.locator('#f-p-n')).toHaveValue('15');
  await expect(page).toHaveURL(new RegExp(site + '$'));
  await page.reload();
  await expect(page.locator('#preset')).toHaveValue('9950x192');
});

test('an edited machine appears on the chart as your pick', async ({ page }) => {
  await page.goto(site);
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Home build server');
  await page.goto(costs);
  await expect(page.locator('#cost-chart .pt[data-id="custom"]')).toHaveAttribute('aria-label', /^Home build server: \$305 per agent/);
  await expect(page.locator('#cost-tbody tr.is-selected')).toContainText('Home build serverYour pick');
  await expect(page.locator('#cost-chart')).toContainText('Your pick');
});

test('blocked storage still draws the chart at the defaults', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(costs);
  await expect(page.locator('#cost-chart .pt')).toHaveCount(19);
  expect(errors).toEqual([]);
});

for (const width of [400, 1280]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`cost chart at ${width}px ${colorScheme} stays inside the page`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      const requests: string[] = [];
      const errors: string[] = [];
      page.on('request', (request) => requests.push(request.url()));
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto(costs);
      await expect(page.locator('#cost-chart .pt')).toHaveCount(19);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const chart = await page.locator('#cost-chart').boundingBox();
      const wrap = await page.locator('#cost-chart-wrap').boundingBox();
      expect(Math.abs(chart!.width - wrap!.width)).toBeLessThan(1);
      expect(await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor))
        .toBe(colorScheme === 'dark' ? 'rgb(13, 18, 25)' : 'rgb(241, 243, 247)');
      const origin = new URL(page.url()).origin;
      expect(requests.filter((url) => new URL(url).origin !== origin)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}

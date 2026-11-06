import { test, expect, type Page } from '@playwright/test';

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

async function settled(page: Page) {
  const canvas = page.locator('#view canvas');
  let last = await canvas.screenshot();
  await expect(async () => {
    const next = await canvas.screenshot();
    const same = next.equals(last);
    last = next;
    expect(same).toBe(true);
  }).toPass({ timeout: 30_000 });
  return last;
}

async function zoom(page: Page, deltaY: number) {
  await page.locator('#view canvas').hover();
  for (let i = 0; i < 40; i++) await page.mouse.wheel(0, deltaY);
}

for (const preset of ['Front', 'Rear', 'Top']) {
  test(`${preset} view keeps its zoom after narrowing and widening the window`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1400, height: 1000 });
    await page.goto(url);
    await page.getByRole('button', { name: preset, exact: true }).click();
    const before = await settled(page);
    await page.setViewportSize({ width: 400, height: 800 });
    await settled(page);
    await page.setViewportSize({ width: 1400, height: 1000 });
    expect((await settled(page)).equals(before)).toBe(true);
  });
}

test('a zoomed-in phone view survives rotating and rotating back', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(url);
  await zoom(page, -500);
  const before = await settled(page);
  await page.setViewportSize({ width: 800, height: 400 });
  await settled(page);
  await page.setViewportSize({ width: 400, height: 800 });
  expect((await settled(page)).equals(before)).toBe(true);
});

test('the model stays drawn when fully zoomed out on a narrow phone', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(url);
  await zoom(page, 500);
  const png = await settled(page);
  const darkPixels = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 300) n++;
    return n;
  }, png.toString('base64'));
  expect(darkPixels).toBeGreaterThan(100);
});

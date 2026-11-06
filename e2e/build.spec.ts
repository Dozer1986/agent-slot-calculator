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

async function frontPreset(page: Page) {
  await page.getByRole('button', { name: 'Front', exact: true }).click();
  return settled(page);
}

async function rightDrag(page: Page) {
  const box = (await page.locator('#view canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2 + 150);
  await page.mouse.up({ button: 'right' });
}

test('a view button brings a panned model back to the clean preset', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto(url);
  const clean = await frontPreset(page);
  await rightDrag(page);
  expect((await settled(page)).equals(clean)).toBe(false);
  expect((await frontPreset(page)).equals(clean)).toBe(true);
});

test('a view button pressed straight after a pan leaves no drift', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto(url);
  const clean = await frontPreset(page);
  await rightDrag(page);
  expect((await frontPreset(page)).equals(clean)).toBe(true);
});

test.describe('on a touch phone', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 400, height: 800 } });

  test('a view button brings the model back after a pinch whose fingers drift', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url);
    const clean = await frontPreset(page);
    const box = (await page.locator('#view canvas').boundingBox())!;
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: string, points: { x: number; y: number }[]) =>
      cdp.send('Input.dispatchTouchEvent', { type: type as 'touchStart', touchPoints: points });
    const fingers = (spread: number, drift: number) => [
      { x: cx - spread + drift, y: cy + drift },
      { x: cx + spread + drift, y: cy + drift },
    ];
    await touch('touchStart', fingers(40, 0));
    for (let i = 1; i <= 10; i++) await touch('touchMove', fingers(40 + i * 5, i * 6));
    await touch('touchEnd', []);
    expect((await settled(page)).equals(clean)).toBe(false);
    expect((await frontPreset(page)).equals(clean)).toBe(true);
  });
});

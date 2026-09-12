import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

// Supplemental measurement harness. The original WM-001 >=30 FPS gate is unchanged.
// Use this identical harness for baseline/candidate, with no concurrent rendered run.
for (const [width, height] of [[1280, 720], [1920, 1080]]) {
  test(`parent FPS measurement ${width}x${height}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/?test=1');
    await expect(page.locator('#loading')).toHaveClass(/hidden/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'WEBMASTER' })).toBeVisible();
    await page.getByRole('button', { name: /New Game/ }).click();
    await page.getByRole('button', { name: /Slot 1/ }).click();
    await page.getByRole('button', { name: /Easy/ }).click();
    await expect(page.locator('#input-overlay')).toBeVisible();
    for (const selector of ['.objective-card', '.health-card']) {
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    }
    await page.waitForTimeout(2200);
    const samples = await page.evaluate(() => (window as any).__WM_DEBUG__.performance());
    const output = process.env.WM_MEASUREMENT_OUTPUT;
    if (!output) throw new Error('WM_MEASUREMENT_OUTPUT required');
    await mkdir(output, { recursive: true });
    const record = {
      author: 'WEBMASTER_PRODUCT_OWNER',
      label: process.env.WM_MEASUREMENT_LABEL ?? 'UNSPECIFIED',
      observedAt: new Date().toISOString(),
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim(),
      sourceDiff: execFileSync('git', ['diff', '--stat', '--', 'src', 'package.json', 'pnpm-lock.yaml', 'vite.config.ts'], { encoding: 'utf8' }),
      browserName, viewport: [width, height], samples,
      method: 'Ordinary New Game / slot 1 / Easy; adaptive quality default; wait 2200ms after input-overlay; same debug.performance() samples as unchanged WM-001 representative gate; video enabled.',
      absoluteFloor: 30,
      absoluteResult: samples.minimum >= 30 ? 'PASS' : 'NOT_MET',
      limitation: 'Headless Linux software-renderer measurement; not physical Windows/iPad or swing-route performance.'
    };
    await writeFile(`${output}/${record.label}-${width}x${height}.json`, JSON.stringify(record, null, 2) + '\n');
    console.log(JSON.stringify(record));
    expect(samples.samples.length).toBeGreaterThanOrEqual(1);
    expect(samples.minimum).toBeGreaterThanOrEqual(30);
  });
}

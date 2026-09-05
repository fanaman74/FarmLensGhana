import { expect, test } from '@playwright/test';

test('integration endpoints deny visitors and cross-origin mutations', async ({ request }) => {
  expect((await request.get('/api/settings/integrations')).status()).toBe(401);
  expect((await request.post('/api/settings/integrations/olmoearth/test', { headers: { Origin: 'https://untrusted.example' } })).status()).toBe(403);
  expect((await request.post('/api/settings/integrations/olmoearth/test', { headers: { Origin: 'http://127.0.0.1:4321' } })).status()).toBe(401);
});

test('satellite honours crop links and keeps AI mapping locked', async ({ page }) => {
  await page.goto('/satellite?crop=cocoa');
  await expect(page.getByRole('button', { name: 'Crop Explorer' })).toBeEnabled();
  await expect(page.getByLabel('Crop or plant')).toHaveValue('cocoa');
  await page.getByRole('button', { name: /AI Crop Map/ }).click();
  await expect(page.getByRole('button', { name: 'Model not available' })).toBeDisabled();
});

test('key pages fit the viewport and support keyboard focus', async ({ page }, testInfo) => {
  for (const route of ['/', '/weather', '/soil', '/crops', '/satellite', '/settings']) {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, `Horizontal overflow on ${route}`).toBe(false);
  }
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('settings-layout.png'), fullPage: true });
});

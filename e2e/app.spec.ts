import { test, expect } from '@playwright/test';
test('navigates crop library and detail', async ({ page }) => { await page.goto('/crops'); await expect(page.getByRole('heading', {name:/Know the crop/i})).toBeVisible(); await page.getByPlaceholder(/Search common/i).fill('maize'); await page.getByRole('link', {name:/Maize/i}).click(); await expect(page.getByRole('heading',{name:'Maize',exact:true})).toBeVisible(); });
test('satellite field scan posts filters and renders catalogue scenes', async ({ page }) => {
  await page.route('**/api/satellite/search', async route => {
    const body = route.request().postDataJSON();
    expect(body.latitude).toBe(7.9465);
    expect(body.longitude).toBe(-1.0232);
    expect(body.from).toBe('2026-08-01');
    expect(body.to).toBe('2026-09-01');
    expect(body.cloud).toBe(12);
    await route.fulfill({ json: { scenes: [{ id: 'test-scene', date: '2026-08-20T10:00:00Z', cloud: 8 }] } });
  });
  await page.goto('/satellite');
  const fieldScan = page.getByRole('button',{name:/Field Scan/i});
  await expect(fieldScan).toBeEnabled();
  await fieldScan.click();
  await page.locator('input[type="date"]').nth(0).fill('2026-08-01');
  await page.locator('input[type="date"]').nth(1).fill('2026-09-01');
  await page.locator('input[type="range"]').fill('12');
  await page.getByRole('button',{name:/Search catalogue/i}).click();
  await expect(page.getByText('test-scene', { exact: false })).toBeVisible();
  await expect(page.getByText(/boundary stays in this browser/i)).toBeVisible();
});
test('settings protects integration status', async ({ page }) => { await page.goto('/settings'); await expect(page.getByRole('heading',{name:'Administrator access'})).toBeVisible(); });

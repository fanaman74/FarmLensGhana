import { test, expect } from '@playwright/test';

test('farm corners and connecting lines remain visible without basemap tiles', async ({ page }) => {
  await page.route('**/server.arcgisonline.com/**', route => route.abort());
  await page.goto('/satellite');
  await page.getByRole('button', { name: 'Draw farm', exact: true }).click();
  const map = page.locator('.farm-map');
  await map.scrollIntoViewIfNeeded();
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * .25, box.y + box.height * .35);
  await page.mouse.click(box.x + box.width * .55, box.y + box.height * .35);
  await expect(page.locator('.boundary-overlay circle')).toHaveCount(2);
  await expect(page.locator('.boundary-overlay polyline')).toHaveAttribute('stroke', '#e8ffb9');
  await page.mouse.click(box.x + box.width * .45, box.y + box.height * .5);
  await expect(page.locator('.boundary-overlay polygon')).toBeVisible();
  await page.getByRole('button', { name: 'Undo corner' }).click();
  await expect(page.locator('.boundary-overlay circle')).toHaveCount(2);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.boundary-overlay circle')).toHaveCount(0);
});

test('monthly outlook follows the selected place and renders 30 days', async ({ page }) => {
  await page.route('**/api/weather/monthly?**', route => route.fulfill({ json: { grid: { latitude: 9.4, longitude: -.8 }, fetchedAt: '2026-09-05T12:00:00Z', days: Array.from({ length: 30 }, (_, i) => ({ date: `2026-09-${String(i+1).padStart(2,'0')}`, high: 30, low: 22, rain: 3 })) } }));
  await page.route('**/api/geocode?**', route => route.fulfill({ json: { results: [{ id: 1, name: 'Tamale', region: 'Northern', latitude: 9.4, longitude: -.8 }] } }));
  await page.goto('/soil');
  await page.getByRole('textbox', { name: 'Search Ghanaian town or district' }).fill('Tamale');
  const request = page.waitForRequest(r => r.url().includes('/api/weather/monthly?latitude=9.4&longitude=-0.8'));
  await page.getByRole('button', { name: /Tamale/ }).click();
  await request;
  await expect(page.getByRole('region', { name: 'Monthly weather outlook' })).toContainText('Tamale');
  await expect(page.locator('.outlook-day')).toHaveCount(30);
});

test('crop finder separates crop request from newer generic land cover', async ({ page }) => {
  await page.route('**/api/geocode?**', route => route.fulfill({ json: { results: [{ id: 1, name: 'Kumasi', region: 'Ashanti', latitude: 6.68, longitude: -1.62 }] } }));
  await page.route('**/api/satellite/recent?**', route => route.fulfill({ json: { scenes: [{ id: 'test-scene', date: '2026-09-02T10:00:00Z', cloud: 20 }] } }));
  await page.goto('/crop-finder');
  await page.getByRole('textbox', { name: 'Search Ghanaian town or district' }).fill('Kumasi');
  await page.getByRole('button', { name: /Kumasi/ }).click();
  await expect(page.getByRole('textbox', { name: 'Search Ghanaian town or district' })).toHaveValue('Kumasi, Ashanti');
  await expect(page.getByText('Selected: Kumasi, Ashanti')).toBeVisible();
  await page.getByPlaceholder('For example, Maize').fill('Cocoa');
  await page.getByRole('button', { name: 'Explore crop area' }).click();
  await expect(page.getByRole('heading', { name: 'Cocoa imagery search' })).toBeVisible();
  await expect(page.getByText('Overlay: 2025 annual cropland.')).toBeVisible();
  await expect(page.getByText('test-scene', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dedicated tree-crop layer' })).toBeVisible();
  await page.route('**/api/earth-engine/map', async route => {
    expect(route.request().postDataJSON().kind).toBe('cocoa');
    await route.fulfill({ status: 503, json: { error: 'Server authentication required.' } });
  });
  await page.getByRole('button', { name: 'Load Earth Engine layer' }).click();
  await expect(page.getByRole('alert')).toContainText('Server authentication required.');
});

test('Earth Engine endpoints reject visitors testing credentials and unsafe input', async ({ request }) => {
  expect((await request.post('/api/settings/earth-engine/test', { headers: { Origin: 'http://127.0.0.1:4321' } })).status()).toBe(401);
  expect((await request.post('/api/earth-engine/map', { headers: { Origin: 'https://example.org' }, data: {} })).status()).toBe(403);
  expect((await request.post('/api/earth-engine/map', { headers: { Origin: 'http://127.0.0.1:4321' }, data: { kind: 'cashew', latitude: 0 } })).status()).toBe(400);
});

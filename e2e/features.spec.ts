import { test, expect } from '@playwright/test';

function weatherFixture(grid: [number, number], moisture = .296, rainfall = 46) {
  const times = Array.from({ length: 24 }, (_, index) => new Date(Date.UTC(2026, 8, 5, 12 + index)).toISOString().slice(0, 16));
  return {
    ok: true,
    source: 'Open-Meteo',
    fetchedAt: '2026-09-05T12:30:00.000Z',
    data: {
      location: { latitude: grid[0], longitude: grid[1], timezone: 'Africa/Accra' },
      current: { time: '2026-09-05T12:00', temperature: 23.5, apparentTemperature: 24, humidity: 80, precipitation: 0, weatherCode: 2, windSpeed: 8, windGusts: 12 },
      daily: Array.from({ length: 7 }, (_, index) => ({ date: `2026-09-${String(index + 5).padStart(2, '0')}`, weatherCode: 2, maxTemperature: 30, minTemperature: 22, precipitationProbability: 40, rainfall: rainfall / 7, et0: 3, windSpeed: 8, windGusts: 12 })),
      hourly: times.map((time) => ({ time, temperature: 23.5, humidity: 80, precipitationProbability: 40, rainfall: 0, soilTemperature: 23.9, soilMoisture: moisture }))
    }
  };
}

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

test('map clicks replace soil data and report an actual shared provider grid', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('farmlens-location'));
  await page.route('**/server.arcgisonline.com/**', route => route.abort());
  const requestCoordinates: Array<[string, string]> = [];
  await page.route('**/api/weather?**', async route => {
    const url = new URL(route.request().url());
    requestCoordinates.push([url.searchParams.get('latitude')!, url.searchParams.get('longitude')!]);
    await route.fulfill({ json: weatherFixture([6.7135324, -1.5895691]) });
  });
  await page.goto('/soil');
  await expect(page.getByText(/Model sample:/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Draw farm' })).toBeEnabled();
  const map = page.locator('.farm-map');
  await map.scrollIntoViewIfNeeded();
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * .24, box.y + box.height * .36);
  await expect.poll(() => requestCoordinates.length).toBe(2);
  expect(requestCoordinates[0]).not.toEqual(requestCoordinates[1]);
  await expect(page.getByRole('status').filter({ hasText: 'Same model area as your previous point' })).toBeVisible();
  await expect(page.getByText(/Provider grid: 6\.714°, -1\.590°/)).toBeVisible();
  await expect(page.getByText(/Forecast rain · 7 days/)).toBeVisible();
});

test('a slow old soil response cannot overwrite a newer map selection', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('farmlens-location'));
  await page.route('**/server.arcgisonline.com/**', route => route.abort());
  let releaseOld!: () => void;
  const oldResponse = new Promise<void>(resolve => { releaseOld = resolve; });
  let calls = 0;
  await page.route('**/api/weather?**', async route => {
    calls += 1;
    if (calls === 1) {
      await route.fulfill({ json: weatherFixture([6.7135324, -1.5895691], .296, 46) });
      return;
    }
    if (calls === 2) {
      await oldResponse;
      await route.fulfill({ json: weatherFixture([9.384886, -.86013794], .210, 55.5) }).catch(() => undefined);
      return;
    }
    await route.fulfill({ json: weatherFixture([5.5887523, -.22406006], .127, 20.2) });
  });
  await page.goto('/soil');
  await expect(page.getByText(/Provider grid: 6\.714°, -1\.590°/)).toBeVisible();
  await expect(page.locator('.soil-primary').getByText('29.6%')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Draw farm' })).toBeEnabled();
  const map = page.locator('.farm-map');
  await map.scrollIntoViewIfNeeded();
  const box = (await map.boundingBox())!;
  const requestB = page.waitForRequest(r => r.url().includes('/api/weather?') && !r.url().includes('6.6885'));
  await page.mouse.click(box.x + box.width * .72, box.y + box.height * .62);
  await requestB;
  await expect(page.locator('.soil-insights .soil-primary')).toHaveCount(0);
  await expect(page.locator('.soil-insights').getByRole('status')).toContainText('Loading model estimates for the selected point');
  const requestC = page.waitForRequest(r => r.url().includes('/api/weather?') && !r.url().includes('6.6885'));
  await page.mouse.click(box.x + box.width * .28, box.y + box.height * .28);
  await requestC;
  await expect(page.getByText(/Provider grid: 5\.589°, -0\.224°/)).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Same model area as your previous point' })).toHaveCount(0);
  releaseOld();
  await expect(page.getByText(/Provider grid: 5\.589°, -0\.224°/)).toBeVisible();
  await expect(page.locator('.soil-primary').getByText('12.7%')).toBeVisible();
  await expect(page.getByText('20.2 mm')).toBeVisible();
});

test('soil selection keeps coordinates visible and offers retry after an error', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('farmlens-location'));
  let attempts = 0;
  await page.route('**/api/weather?**', route => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 400, json: { ok: false, error: { message: 'Fixture weather unavailable.' } } })
      : route.fulfill({ json: weatherFixture([6.7135324, -1.5895691]) });
  });
  await page.goto('/soil');
  await expect(page.getByText('Selected point: 6.6885°, -1.6244°')).toBeVisible();
  await expect(page.getByText('Soil estimates unavailable')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.soil-primary').getByText('29.6%')).toBeVisible();
});

test('a completed soil boundary can be replaced by a later map point', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('farmlens-location'));
  await page.route('**/server.arcgisonline.com/**', route => route.abort());
  let calls = 0;
  await page.route('**/api/weather?**', async route => {
    calls += 1;
    await route.fulfill({ json: weatherFixture([6.7135324, -1.5895691]) });
  });
  await page.goto('/soil');
  await expect(page.getByText(/Model sample:/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Draw farm' })).toBeEnabled();
  const map = page.locator('.farm-map');
  await map.scrollIntoViewIfNeeded();
  const canvas = map.locator('canvas').first();
  await expect(canvas).toBeVisible();
  for (let index = 0; index < 6; index += 1) {
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.waitForTimeout(400);
  }
  await page.getByRole('button', { name: 'Draw farm' }).click();
  await map.scrollIntoViewIfNeeded();
  const canvasBox = (await canvas.boundingBox())!;
  const centreX = canvasBox.width / 2;
  const centreY = canvasBox.height / 2;
  await canvas.click({ position: { x: centreX - 24, y: centreY - 20 } });
  await canvas.click({ position: { x: centreX + 24, y: centreY - 20 } });
  await canvas.click({ position: { x: centreX, y: centreY + 24 } });
  await expect(page.getByRole('button', { name: /Finish \(3\)/ })).toBeVisible();
  await page.getByRole('button', { name: /Finish \(3\)/ }).click();
  await expect(page.getByText(/Boundary ready near Selected farm centre/)).toBeVisible();
  const callsAfterBoundary = calls;
  await page.waitForTimeout(700);
  await map.scrollIntoViewIfNeeded();
  const newCanvasBox = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: newCanvasBox.width * .8, y: newCanvasBox.height * .6 } });
  await expect.poll(() => calls).toBeGreaterThan(callsAfterBoundary);
  await expect(page.getByText(/Boundary ready near Selected farm centre/)).toHaveCount(0);
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

test('a drawn farm shows every provider section from the farm report', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('farmlens-location'));
  await page.route('**/server.arcgisonline.com/**', route => route.abort());
  await page.route('**/api/weather?**', route => route.fulfill({ json: weatherFixture([6.7135324, -1.5895691]) }));
  const ok = <T,>(data: T, source: string) => ({ ok: true, data, source, resolution: 'test' });
  const depths = (values: number[]) => values.map((value, i) => ({ depth: ['0–5 cm', '5–15 cm', '15–30 cm'][i], value }));
  const soilProperty = (label: string, unit: string, value: number) => ({ label, unit, byDepth: depths([value, value, value]), topsoil: value });
  let posted: { type: string; coordinates: number[][][] } | undefined;
  await page.route('**/api/farm/report', async route => {
    posted = route.request().postDataJSON();
    await route.fulfill({ json: {
      centroid: { latitude: 6.7, longitude: -1.6 }, fetchedAt: '2026-09-05T12:00:00Z',
      place: ok({ community: 'Ejisu', district: 'Ejisu Municipal District', region: 'Ashanti Region', displayName: 'Ejisu, Ashanti Region, Ghana' }, 'OpenStreetMap Nominatim'),
      elevation: ok({ centre: 270, min: 262, max: 281, mean: 271, samples: 12 }, 'Open-Meteo Elevation (Copernicus DEM)'),
      soil: ok({ textureClass: 'Sandy loam', phClass: 'Moderately to slightly acidic', properties: { phh2o: soilProperty('pH (water)', '', 5.9), clay: soilProperty('Clay', '%', 18), sand: soilProperty('Sand', '%', 60), silt: soilProperty('Silt', '%', 22), soc: soilProperty('Organic carbon', 'g/kg', 12), nitrogen: soilProperty('Total nitrogen', 'g/kg', 1.1), cec: soilProperty('Cation exchange capacity', 'cmol(c)/kg', 9), bdod: soilProperty('Bulk density', 'g/cm³', 1.35) } }, 'ISRIC SoilGrids 2.0'),
      landCover: ok({ year: 2025, croplandPercent: 64.2, classes: [{ code: 5, name: 'Crops', percent: 64.2 }, { code: 2, name: 'Trees', percent: 35.8 }], baseline: { year: 2017, croplandPercent: 40 } }, 'Esri / Impact Observatory 10 m land cover'),
      climate: ok({ period: '2001–2020', annualRainfallMm: 1420, wettestMonth: 'Jun', monthsOver100mm: 7, months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((month) => ({ month, rainfallMm: 118, maxTemperature: 31, minTemperature: 21, humidity: 80, solar: 5 })) }, 'NASA POWER'),
      scenes: { ok: false, error: 'The satellite catalogue is unavailable right now.', source: 'Element 84 Earth Search (Sentinel-2 L2A)' },
    } });
  });
  await page.goto('/soil');
  await expect(page.getByText(/Model sample:/)).toBeVisible();
  const map = page.locator('.farm-map');
  await map.scrollIntoViewIfNeeded();
  const canvas = map.locator('canvas').first();
  await expect(canvas).toBeVisible();
  for (let index = 0; index < 6; index += 1) { await page.getByRole('button', { name: 'Zoom in' }).click(); await page.waitForTimeout(400); }
  await page.getByRole('button', { name: 'Draw farm' }).click();
  await map.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width / 2 - 24, y: box.height / 2 - 20 } });
  await canvas.click({ position: { x: box.width / 2 + 24, y: box.height / 2 - 20 } });
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 + 24 } });
  await page.getByRole('button', { name: /Finish \(3\)/ }).click();
  const report = page.locator('.boundary-summary');
  await expect(report).toContainText('Ejisu Municipal District');
  await expect(report).toContainText('64.2% of the boundary');
  await expect(report).toContainText('40.0% in 2017');
  await expect(report).toContainText('Sandy loam');
  await expect(report).toContainText('270 m above sea level');
  await expect(report).toContainText('1,420 mm');
  await expect(report).toContainText('The satellite catalogue is unavailable right now.');
  await expect(report).toContainText('9–27 cm');
  expect(posted?.type).toBe('Polygon');
  expect(posted?.coordinates[0]).toHaveLength(4);
});

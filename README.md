# FarmLens Ghana

FarmLens Ghana is a server-rendered Astro application that brings Ghana-focused weather, modelled soil conditions, crop guidance, and satellite-provider workflows into one field-friendly interface.

## Implementation status

This is an application foundation, not yet the complete production release described in the brief. The review on 2026-09-05 passed Astro checking, ESLint, 18 unit tests, 12 desktop/mobile browser tests, and the production build. A live request returned seven Open-Meteo forecast days. Browser layout and keyboard focus checks cover all six primary pages.

Known remaining work:

- Satellite Catalog now uses real server-side OAuth and the documented Sentinel Hub search endpoint. Rendering, statistics, imagery overlays, and durable farm persistence are unfinished.
- AgroMonitoring and AppEEARS are scaffolded; authenticated field processing and research tasks are not implemented.
- OlmoEarth authentication testing exists, but model validation, inference and prediction overlays remain disabled. Environment-managed credentials are read-only in the UI; no encrypted database editing workflow is implemented.
- Crop agronomy ranges and local names are unverified seed placeholders. Compatibility scoring is disabled pending source verification. FAOSTAT has no verified data extract.
- Unit and provider preferences are persisted but not yet consistently applied to every view. Reduced-motion preference is not yet fully wired to map animations.
- Login/test rate limits are process-local; distributed deployments require a shared limiter. The session signing secret must be rotated to revoke all outstanding sessions.
- Satellite base-map tiles require access to Esri. Network failures now display an explicit message.

## Available foundation

- Live Ghana location search and seven-day forecasts through Open-Meteo
- Current weather, hourly rain, ET₀, modelled soil moisture, and soil temperature
- Transparent threshold-based farming notices
- Searchable ten-crop draft library and live weather context
- MapLibre satellite basemap with point selection and local GeoJSON boundary drawing
- Satellite provider selection and honest missing-credential states
- Locked AI Crop Map until a validated Ghana-trained OlmoEarth model is configured
- Browser-local visitor preferences
- Administrator-only integration status and OlmoEarth connection test
- Strict request validation, secure session cookies, rate limits, timeouts, and security headers

## Requirements

- Node.js 22 or newer
- pnpm 10 or newer

## Install and run

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open `http://localhost:4321`.

## Environment

Copy `.env.example` and add only the providers you intend to use. No secret uses a `PUBLIC_` prefix and no provider credential is sent to browser code.

The app remains useful without optional credentials. Open-Meteo does not require a key. Sentinel Hub, AgroMonitoring, NASA AppEEARS, and OlmoEarth show clear setup states when unavailable.

### Administrator access

Set `APP_ENCRYPTION_KEY` to at least 32 random characters. Generate a scrypt password value in Node and store the printed value as `ADMIN_PASSWORD_HASH`:

```bash
node -e "const c=require('node:crypto'),s=c.randomBytes(16).toString('hex');console.log('scrypt$'+s+'$'+c.scryptSync(process.argv[1],s,64).toString('hex'))" "YOUR-STRONG-PASSWORD"
```

Integration secrets are environment-managed in this implementation. The Settings UI is intentionally read-only for credential mutations: add, rotate, or revoke keys in the deployment secret manager and restart the service. This prevents writes to a serverless ephemeral filesystem. The administrator can view masked status and run a rate-limited OlmoEarth authentication test.

## OlmoEarth model setup

AI Crop Map remains disabled in this release, even when `OLMOEARTH_API_KEY` and `OLMOEARTH_MODEL_ID` are set. Before implementing and enabling inference in production, document:

- representative Ghana labels across regions, seasons, field sizes, and management systems;
- spatially separated train, validation, and test splits;
- class-level precision, recall, F1, confusion matrix, and coverage;
- the confidence threshold and `unknown` behaviour;
- model version, training-data period, modalities, and evaluation date;
- review by Ghanaian agronomists or extension specialists.

The connection test uses the documented read-only-style `POST /api/v1/areas/search` query with `limit: 1`. Secret values are never logged or returned.

## Validation

```bash
pnpm check
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Unit tests cover spectral indices, soil temperature conversion, farming rules, polygon validation and area limits, provider task states, confidence thresholds, credential masking, and crop routing. Playwright covers crop navigation, satellite missing-provider behaviour, settings access control, and desktop/mobile projects.

## Deployment

`astro.config.mjs` uses Astro's standalone Node adapter. Build with `pnpm build`, then run:

```bash
node dist/server/entry.mjs
```

Deploy behind HTTPS. Set all secrets in the host's managed secret store. Use a durable encrypted database only if runtime credential updates are later added; do not write secrets to the repository or local serverless storage.

## Data boundaries

- Open-Meteo soil values are weather-model estimates, never described as field-sensor measurements.
- Crop ranges are broad references with source notes; confirm variety-specific advice with Ghana MoFA, CSIR institutes, COCOBOD, or a local extension officer.
- The crop detail page does not invent FAOSTAT figures. National charts remain empty until an official normalized extract is verified.
- NDVI, EVI, NDMI, temperature, and evapotranspiration do not prove crop species.
- Satellite and AI outputs must always show provider, product/model version, acquisition date, resolution, cloud/quality data, units, processing state, and limitations before production activation.

## Primary references

- [Astro documentation](https://docs.astro.build/)
- [Open-Meteo forecast API](https://open-meteo.com/en/docs)
- [FAOSTAT](https://www.fao.org/faostat/en/)
- [Sentinel Hub APIs](https://docs.sentinel-hub.com/api/latest/)
- [AgroMonitoring API](https://agromonitoring.com/api)
- [NASA AppEEARS](https://appeears.earthdatacloud.nasa.gov/api/)
- [OlmoEarth documentation](https://docs.olmoearth.allenai.org/)

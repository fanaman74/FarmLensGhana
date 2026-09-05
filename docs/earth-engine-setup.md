# Earth Engine connection

Configured project ID: `mapssp-1499716002898` (display name MapsSP). Account registration was reported by the user; project access has not yet been authenticated from this server.

## What the app implements

- Dynamic World crops probability averaged over a chosen 1–93 day period, limited to the selected local area. Generic crops, not individual species.
- Forest Data Partnership cocoa and palm model_2025b probability for observation year 2024. User-selected display threshold, not guaranteed classification accuracy.
- Sentinel-1 descending IW VH backscatter average for the chosen period. Cloud-resilient signal, not crop identification.
- A 4 × 4 km window around the selected place, or a valid drawn polygon up to 3,000 ha and approximately 10 km extent. Imagery is clipped to that area.
- Dated source metadata, no-observation errors, small-map caching, at most two simultaneous computations, six map requests per IP per minute, and a server-authenticated tile proxy. Google access tokens are never sent to visitors.
- Administrator-only connection test in Settings. No batch exports, bucket creation, training or billing changes.

## Authenticate this local development server

Use Google's [Application Default Credentials setup](https://cloud.google.com/docs/authentication/set-up-adc-local-dev-environment) after installing the Google Cloud CLI. Run the interactive login yourself, signing into the account registered for this project. Do not paste passwords, refresh tokens or JSON key contents into chat.

```powershell
gcloud auth application-default login
gcloud auth application-default set-quota-project mapssp-1499716002898
```

The server uses `google-auth-library` to obtain and refresh ADC and gives the Earth Engine client only short-lived tokens. Local ADC authentication is for development, not public production hosting. If credentials are in a nonstandard file, set `GOOGLE_APPLICATION_CREDENTIALS` to its absolute path in local `.env`. Keep credential files outside the repository.

In Google Cloud, confirm the Earth Engine API is enabled and this exact project is registered for the appropriate plan. Google documents the required [Earth Engine IAM access](https://developers.google.com/earth-engine/guides/access_control); grant the minimum needed roles rather than Owner. Project registration and service-account permission are distinct from a personal Google login.

Restart the local server after changing `.env`; unlock Settings with the administrator password and select **Test Earth Engine connection**. A successful check is required before claiming live access. Then select a crop/location in Find crops and request a layer.

## Hosted deployment

Railway can run this without any visitor Google login. Create a dedicated service account in project `mapssp-1499716002898`, grant only the Earth Engine permissions required to create/read maps, and confirm the project is registered for Earth Engine. See Google's [service-account guidance](https://developers.google.com/earth-engine/guides/service_account). Downloading a JSON key is a sensitive action: keep it only in Railway's secret store, rotate it if exposed, and never commit or paste it into the application UI.

Add these Railway Variables:

```text
GEE_PROJECT_ID=mapssp-1499716002898
GEE_PUBLIC_MAPS_ENABLED=true
GEE_SERVICE_ACCOUNT_JSON={the complete service-account JSON object}
```

The JSON stays on the server. FarmLens exchanges it for short-lived Google access tokens, proxies map tiles, and never returns the key or token to visitors. As an alternative for multiline-secret issues, set `GEE_SERVICE_ACCOUNT_EMAIL` and `GEE_SERVICE_ACCOUNT_PRIVATE_KEY`; escaped `\\n` line breaks are accepted. Use one credential format only.

After adding the variables, redeploy Railway, unlock FarmLens Settings, and run **Test Earth Engine connection**. A `credentials configured` status means variables are present; only a successful connection test proves the API, IAM, project registration and key all work.

Set `GEE_PROJECT_ID` and explicitly enable `GEE_PUBLIC_MAPS_ENABLED=true` only after confirming intended visitor use is compatible with the registered plan and quotas. Community/non-commercial registration does not authorize commercial use or guarantee unlimited processing. Disable visitor processing with `GEE_PUBLIC_MAPS_ENABLED=false`.

For multi-instance hosting, replace in-memory map tickets, request limits and caches with shared storage and a project-wide quota budget. The current limits are for this single-server app and are not a substitute for Cloud quota configuration.

Source notes: [Dynamic World](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_DYNAMICWORLD_V1), [cocoa](https://developers.google.com/earth-engine/datasets/catalog/projects_forestdatapartnership_assets_cocoa_model_2025b), [palm](https://developers.google.com/earth-engine/datasets/catalog/projects_forestdatapartnership_assets_palm_model_2025b). A release called 2025b must not be labeled as current 2026 observations. The 2025 cropland baseline is hidden while an Earth Engine analysis layer is active.

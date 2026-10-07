# Data providers

Reviewed 2026-10-07. Every provider below is free to use. "No key" means FarmLens calls it without any signup.

## In use

| Data | Provider | Key | Resolution | Why this one |
| --- | --- | --- | --- | --- |
| Forecast weather, modelled soil moisture (3–9, 9–27, 27–81 cm) and soil temperature | Open-Meteo forecast API | No key | ~9–25 km model grid | Best free forecast for Ghana: blends ECMWF IFS, GFS and ICON with no key and a generous non-commercial quota. OpenWeather, Tomorrow.io and WeatherAPI need keys and offer fewer agricultural variables on free tiers. Kept. |
| 30-day outlook | Open-Meteo seasonal (ECMWF EC46) | No key | ~36 km | No other keyless provider offers sub-seasonal forecasts. Kept. |
| Place search (type-ahead) | Open-Meteo geocoding (GeoNames) | No key | Named places | Allows type-ahead use. Nominatim's policy forbids autocomplete; Photon allows it but is a best-effort community service. Kept. |
| Community, district and region for a drawn farm | OpenStreetMap Nominatim reverse geocoding | No key, 1 request/second, app must identify itself | Mapped places | Added. OSM records Ghana's district boundaries; GeoNames does not reliably. Server-side, cached, and throttled to the usage policy. |
| Elevation and relief across a farm | Open-Meteo Elevation (Copernicus DEM GLO-90) | No key | 90 m | Added. Copernicus DEM is the most accurate free global DEM; one call samples up to 100 points. |
| Soil properties (pH, texture, organic carbon, nitrogen, CEC, bulk density) | ISRIC SoilGrids 2.0 | No key, fair use 5 requests/minute | 250 m | Added. Cached per ~100 m and limited to 5 calls a minute. Built-up areas and water return no data, shown as such. |
| Land cover inside a farm, current year and 2017 | Esri / Impact Observatory Sentinel-2 10 m land cover | No key | 10 m | Added. Same product as the map's cropland overlay, so the numbers match what the user sees. |
| Long-term rainfall, temperature, humidity and sunlight | NASA POWER agroclimatology | No key | ~50 km | Added. Designed for agriculture, covers Africa well, and gives monthly climatology in one call. |
| Sentinel-2 scenes over a farm | Element 84 Earth Search STAC | No key | 10 m imagery | Kept, now searched with the farm polygon instead of a box around a point. Microsoft Planetary Computer is equivalent; no reason to switch. |
| Basemap imagery | Esri World Imagery | No key | Sub-metre in towns | Kept. Best free high-resolution imagery for Ghana. |

## Worth adding later (free, but need a signup)

- **iSDAsoil** (iSDA Africa): 30 m soil properties trained on African soil samples, including extractable P, K and other nutrients. Better than SoilGrids for Ghana farms, but the API needs a free account (username and password).
- **CHIRPS rainfall** via Google Earth Engine: 5 km satellite rainfall, the standard for African drought monitoring. Already reachable once Earth Engine is configured.
- **Sentinel-2 NDVI statistics** via Earth Engine or Copernicus Data Space (free account): crop vigour over the drawn polygon.

## Accuracy changes

- Farm area and perimeter use WGS84 ellipsoid scales at the farm's latitude. The previous calculation agreed to within 0.1%; a spherical-Earth formula would overstate Ghana areas by about 0.6%, so it was not used.
- The farm centre is the area-weighted centroid. The previous corner average drifted toward whichever edge had more clicks, which moved every centre-point lookup.
- The weather report labelled 3–9 cm moisture as "root zone". It now shows three depths with their labels.

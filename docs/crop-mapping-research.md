# Ghana crop mapping: implementation and next stage

Reviewed 5 September 2026. No paid jobs, new accounts or model-training runs were started.

## Available now

The visitor crop-finder page geocodes a selected town/district centre and displays Esri imagery with the **2025** Esri / Impact Observatory / Microsoft generic cropland class. A live ImageServer query confirmed a 2025 raster and exportImage returned PNG. The 2019 DE Africa layer was removed after the user requested fresher data. The selected crop does not change the generic mask. Missing tiles or blank pixels must not be interpreted as proof of no crops. Search does not retrieve an official district boundary. A separate last-30-days Earth Search catalogue request lists Sentinel-2 acquisition dates and whole-scene cloud cover; these recent scenes are not rendered as the basemap. Live lookup near Kumasi found a 2 September 2026 scene.

The [DE Africa specification](https://docs.digitalearthafrica.org/en/latest/data_specs/Cropland_extent_specs.html) identifies this as a 10 m, 2019 Sentinel-2 product. It excludes many perennial crops and has omission/commission errors. Use it as a baseline or soft feature, not a hard agricultural boundary filter; particularly do not remove cocoa or oil-palm candidates because the mask is zero. It is not parcel delineation and cannot establish current planting.

## Recommended processing path

1. Resolve a reviewed administrative polygon or visitor AOI and season. Cache raster processing by geometry, season and model version. Do not infer district boundaries from a point geocoder.
2. Retrieve Sentinel-1 VV/VH seasonal time series, consistent orbit/geometry, terrain-corrected backscatter and observation counts. Aggregate to model-aligned time steps. Keep missing data explicit. Add cloud-masked Sentinel-2 where available and the required meteorology/topography.
3. Fine-tune a crop-type head on Presto, with an other/unknown class, supported Ghana crop taxonomy, and spatially and temporally separate evaluation. Compare against a simple baseline. Calibrate per-class thresholds and reject unsupported seasons/regions.
4. Publish dated predictions with model version, confidence, source scene dates, coverage and evaluation references. Return no-data separately from no-match; render only predictions passing the reviewed threshold. Ground-check before operational use.

This is a proposed design, not a running inference service.

## Provider choices

[Copernicus openEO](https://documentation.dataspace.copernicus.eu/APIs/openEO/openeo_processing.html) documents Sentinel-1 backscatter processing. Inspect a chosen backend's collections/processes and Ghana coverage before submitting a bounded job. Authentication, quota, storage and potentially cost must be agreed before cloud processing. Radar helps with clouds but does not remove crop ambiguity or the need for a seasonal series.

[Presto](https://github.com/nasaharvest/presto) provides pretrained encoders, downstream fine-tuning and missing-band masks. Its Earth Engine export path needs Google Cloud and Earth Engine access; its documented Vertex AI route is another deployment option, not a free turnkey Ghana classifier. Reuse the exact preprocessing, normalization, band order and temporal conventions expected by the selected checkpoint.

[CropHarvest](https://github.com/nasaharvest/cropharvest) is a dataset and benchmark framework, not a ready-to-call crop-identification API. Only part of its data is multiclass. Audit geographical/class coverage and source licences; do not assume all West Africa labels identify species.

[Stanford's Ghana crop-type dataset on Source Cooperative](https://source.coop/stanford/africa-crops-ghana) is a concrete local-label candidate with Sentinel-1, Sentinel-2 and PlanetScope time series from 2016–2017. Its labels assume a fixed crop class over the series. Inspect class definitions, footprint, licence and sensor access before ingestion. These historical labels need contemporary Ghana validation; their existence does not establish 2026 accuracy.

## Remaining prerequisites

### Tree crops and near-real-time annual activity

The user supplied additional tree-crop sources. [Forest Data Partnership cocoa model 2025b](https://developers.google.com/earth-engine/datasets/catalog/projects_forestdatapartnership_assets_cocoa_model_2025b) and [palm model 2025b](https://developers.google.com/earth-engine/datasets/catalog/projects_forestdatapartnership_assets_palm_model_2025b) are newer than model_2025a: their catalogues cover through 2024, with 10 m probability values. The listed data licence is CC-BY 4.0, not a non-commercial-only licence. Platform access/fees are a separate issue. Model version 2025b is not observation year 2025. The catalogue cautions that 2025a can perform better in some contexts. Do not claim a threshold of 0.65 is Ghana-calibrated without evaluation.

[Google's GCS guide](https://developers.google.com/earth-engine/guides/forest_data_partnership_gcs_readme) offers requester-pays raster files; do not enable billing without user approval. An authenticated Earth Engine project is the alternative. The adapter and visitor controls are now implemented for project mapssp-1499716002898, but server authentication is still required. See earth-engine-setup.md. The UI reports missing authentication rather than displaying invented predictions.

[Dynamic World](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_DYNAMICWORLD_V1) is near-real-time generic land-cover probability, not a maize/rice/sorghum classifier. Cloud filtering and observation availability mean a five-day revisit is not a guaranteed five-day local product refresh. Use acquisition dates, coverage and temporal aggregation rather than calling any retrieval current by default.

The Kalischek 2023 publication is a historical cocoa benchmark, not a 2023-to-present monitoring feed. Descals' [2024 oil-palm product](https://doi.org/10.5194/essd-16-5111-2024) maps extent for 2021: publication year and observation year must remain distinct. Neither cocoa nor palm layers establish cashew. SAR VV/VH temporal features may help discriminate crops, but woody backscatter is also affected by moisture/structure and cannot uniquely establish species.

Choose an authenticated processing backend, approve compute/storage scope, audit local training labels, train/evaluate a classifier, and deploy a versioned inference endpoint or reviewed prediction tiles. The app intentionally does not claim these steps are complete.

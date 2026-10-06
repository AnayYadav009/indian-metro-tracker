/**
 * Global map configuration.
 * Hard constraint from project rules:
 * 1. Basemap URL lives in ONE config constant.
 * 2. OSM attribution must always be visible.
 * 3. 100% free: no API keys or billing required.
 */

// Single unified configuration constant for the vector basemap style and attribution
export const BASEMAP_CONFIG = {
  name: "OpenFreeMap Positron",
  styleUrl: "https://tiles.openfreemap.org/styles/positron",
  provider: "OpenFreeMap",
  providerUrl: "https://openfreemap.org",
  osmAttribution: "© OpenStreetMap contributors",
  osmAttributionUrl: "https://www.openstreetmap.org/copyright",
  dataLicense: "ODbL (Open Database License)",
  dataLicenseUrl: "https://opendatacommons.org/licenses/odbl/",
} as const;

// Backward-compatible export constants derived from BASEMAP_CONFIG
export const BASEMAP_STYLE_URL = BASEMAP_CONFIG.styleUrl;
export const OSM_ATTRIBUTION = BASEMAP_CONFIG.osmAttribution;
export const OSM_ATTRIBUTION_URL = BASEMAP_CONFIG.osmAttributionUrl;
export const OPENFREEMAP_ATTRIBUTION = BASEMAP_CONFIG.provider;
export const OPENFREEMAP_ATTRIBUTION_URL = BASEMAP_CONFIG.providerUrl;

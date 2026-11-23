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

// Initial map viewport centered on India
export const INITIAL_VIEW_STATE = {
  longitude: 78.9629,
  latitude: 22.5937,
  zoom: 4.5,
  minZoom: 3.5,
  maxZoom: 18,
};

// Backward-compatible export constants derived from BASEMAP_CONFIG
export const BASEMAP_STYLE_URL = BASEMAP_CONFIG.styleUrl;
export const OSM_ATTRIBUTION = BASEMAP_CONFIG.osmAttribution;
export const OSM_ATTRIBUTION_URL = BASEMAP_CONFIG.osmAttributionUrl;
export const OPENFREEMAP_ATTRIBUTION = BASEMAP_CONFIG.provider;
export const OPENFREEMAP_ATTRIBUTION_URL = BASEMAP_CONFIG.providerUrl;

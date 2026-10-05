/**
 * Global map configuration.
 * Hard constraint from project rules:
 * 1. Basemap URL lives in ONE config constant.
 * 2. OSM attribution must always be visible.
 * 3. 100% free: no API keys or billing required.
 */

// Single configuration constant for the vector basemap style
export const BASEMAP_STYLE_URL =
  "https://tiles.openfreemap.org/styles/positron";

// Initial map viewport centered on India
export const INITIAL_VIEW_STATE = {
  longitude: 78.9629,
  latitude: 22.5937,
  zoom: 4.5,
  minZoom: 3.5,
  maxZoom: 18,
};

// Attribution constants
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
export const OSM_ATTRIBUTION_URL = "https://www.openstreetmap.org/copyright";
export const OPENFREEMAP_ATTRIBUTION = "OpenFreeMap";
export const OPENFREEMAP_ATTRIBUTION_URL = "https://openfreemap.org";

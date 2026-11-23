import { describe, it, expect } from "vitest";
import {
  BASEMAP_STYLE_URL,
  INITIAL_VIEW_STATE,
  OSM_ATTRIBUTION,
  OSM_ATTRIBUTION_URL,
  OPENFREEMAP_ATTRIBUTION,
  OPENFREEMAP_ATTRIBUTION_URL,
} from "@/lib/map-config";

describe("Map Configuration & Hard Constraints", () => {
  it("defines a single free basemap style URL", () => {
    expect(BASEMAP_STYLE_URL).toBeDefined();
    expect(typeof BASEMAP_STYLE_URL).toBe("string");
    expect(BASEMAP_STYLE_URL.startsWith("https://")).toBe(true);
    // Ensure it does not contain any paid API keys or tokens
    expect(BASEMAP_STYLE_URL).not.toContain("key=");
    expect(BASEMAP_STYLE_URL).not.toContain("token=");
  });

  it("configures initial view state centered on India", () => {
    expect(INITIAL_VIEW_STATE.longitude).toBeGreaterThan(68);
    expect(INITIAL_VIEW_STATE.longitude).toBeLessThan(98);
    expect(INITIAL_VIEW_STATE.latitude).toBeGreaterThan(8);
    expect(INITIAL_VIEW_STATE.latitude).toBeLessThan(38);
    expect(INITIAL_VIEW_STATE.zoom).toBeGreaterThanOrEqual(3);
  });

  it("contains OpenStreetMap attribution constants", () => {
    expect(OSM_ATTRIBUTION).toContain("OpenStreetMap");
    expect(OSM_ATTRIBUTION_URL).toContain("openstreetmap.org");
    expect(OPENFREEMAP_ATTRIBUTION).toBe("OpenFreeMap");
    expect(OPENFREEMAP_ATTRIBUTION_URL).toBe("https://openfreemap.org");
  });
});

import { describe, it, expect } from "vitest";
import { determineDataSourceState } from "@/lib/data";

describe("determineDataSourceState pure function", () => {
  const mockSegments = {
    features: [
      { properties: { source: "mock" } },
      { properties: { source: "mock" } },
    ],
  };

  const realSegments = {
    features: [
      { properties: { source: "osm+dmrc" } },
      { properties: { source: "osm+bmrcl" } },
    ],
  };

  const mixedSegments = {
    features: [
      { properties: { source: "osm+dmrc" } },
      { properties: { source: "mock" } },
    ],
  };

  const mockStations = {
    features: [
      { properties: { source: "mock" } },
    ],
  };

  const realStations = {
    features: [
      { properties: { source: "osm+dmrc" } },
    ],
  };

  it("returns 'mock' when all segments and stations are mock", () => {
    const result = determineDataSourceState(mockSegments, mockStations, []);
    expect(result).toBe("mock");
  });

  it("returns 'real' when all segments and stations have non-mock source", () => {
    const result = determineDataSourceState(realSegments, realStations, []);
    expect(result).toBe("real");
  });

  it("returns 'mixed' when segments contain both real and mock sources", () => {
    const result = determineDataSourceState(mixedSegments, realStations, []);
    expect(result).toBe("mixed");
  });

  it("returns 'mixed' when segments are real but stations are mock", () => {
    const result = determineDataSourceState(realSegments, mockStations, []);
    expect(result).toBe("mixed");
  });

  it("respects NEXT_PUBLIC_DATA_SOURCE override when provided", () => {
    expect(determineDataSourceState(realSegments, realStations, [], "mock")).toBe("mock");
    expect(determineDataSourceState(mockSegments, mockStations, [], "real")).toBe("real");
    expect(determineDataSourceState(realSegments, realStations, [], "mixed")).toBe("mixed");
  });

  it("falls back to 'mock' if dataset is empty", () => {
    expect(determineDataSourceState({ features: [] }, { features: [] }, [])).toBe("mock");
  });
});

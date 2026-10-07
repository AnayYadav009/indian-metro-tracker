import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUrlSync } from "@/hooks/use-url-sync";
import { useMetroStore } from "@/store/use-metro-store";
import { determineDataSourceState } from "@/lib/data";

describe("Step 2.3.1 - Characterization: determineDataSourceState error resilience", () => {
  it("handles empty or sparse inputs gracefully", () => {
    // Empty structures
    expect(determineDataSourceState({ features: [] }, { features: [] }, [])).toBe("mock");

    // Features with missing or empty source properties
    const segmentsWithEmptyProps = {
      features: [
        { properties: {} },
        { properties: { source: undefined } },
      ],
    };
    const stationsWithEmptyProps = {
      features: [
        { properties: { source: "" } },
      ],
    };
    const linesWithEmptyProps = [{ source: undefined }, {}];

    expect(determineDataSourceState(segmentsWithEmptyProps as any, stationsWithEmptyProps as any, linesWithEmptyProps as any)).toBe("mock");
  });

  it("handles mixed case source values gracefully", () => {
    const segments = {
      features: [{ properties: { source: "MOCK" } }],
    };
    const stations = {
      features: [{ properties: { source: "MoCk" } }],
    };
    const lines = [{ source: "Mock" }];
    expect(determineDataSourceState(segments as any, stations as any, lines as any)).toBe("mock");
  });
});

describe("Step 2.3.1 - Characterization: useUrlSync URL parsing error resilience", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    useMetroStore.getState().resetFilters();
    useMetroStore.getState().clearSelectedFeature();
    useMetroStore.getState().setHoveredFeature(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setWindowSearch(queryString: string) {
    // Delete and recreate window.location for jsdom test isolation
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      search: queryString,
      pathname: "/",
      href: `http://localhost/${queryString}`,
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    } as any;
  }

  it("ignores completely malformed status query parameters without throwing or breaking store", () => {
    setWindowSearch("?status=invalid_status,unknown,foo");
    renderHook(() => useUrlSync());

    // Should retain default statuses rather than corrupting store
    expect(useMetroStore.getState().selectedStatuses).toEqual([
      "operational",
      "construction",
      "planned",
    ]);
  });

  it("handles empty or partially valid status parameters", () => {
    setWindowSearch("?status=operational,invalid,construction");
    renderHook(() => useUrlSync());

    expect(useMetroStore.getState().selectedStatuses).toEqual([
      "operational",
      "construction",
    ]);
  });

  it("handles malformed selected parameter gracefully (no colon, missing id, invalid type)", () => {
    // Case 1: no colon
    setWindowSearch("?selected=randomstringwithoutcolon");
    renderHook(() => useUrlSync());
    expect(useMetroStore.getState().selectedFeature).toBeNull();

    // Case 2: unrecognized type
    setWindowSearch("?selected=bus:123");
    renderHook(() => useUrlSync());
    expect(useMetroStore.getState().selectedFeature).toBeNull();

    // Case 3: valid type but non-existent entity id
    setWindowSearch("?selected=station:non-existent-station-999");
    renderHook(() => useUrlSync());
    expect(useMetroStore.getState().selectedFeature).toBeNull();

    // Case 4: valid type but empty id
    setWindowSearch("?selected=station:");
    renderHook(() => useUrlSync());
    expect(useMetroStore.getState().selectedFeature).toBeNull();
  });
});

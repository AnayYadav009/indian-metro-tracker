import { describe, it, expect, beforeEach } from "vitest";
import { useMetroStore } from "@/store/use-metro-store";
import type { SegmentProperties, StationProperties } from "@/types/schema";

describe("useMetroStore Zustand State Management", () => {
  beforeEach(() => {
    useMetroStore.getState().resetFilters();
    useMetroStore.getState().clearSelectedFeature();
    useMetroStore.getState().setHoveredFeature(null);
  });

  it("initializes with default filter values", () => {
    const state = useMetroStore.getState();
    expect(state.selectedCityId).toBeNull();
    expect(state.selectedStatuses).toEqual([
      "operational",
      "construction",
      "planned",
    ]);
    expect(state.selectedPhases).toEqual([]);
    expect(state.searchQuery).toBe("");
    expect(state.selectedFeature).toBeNull();
    expect(state.hoveredFeature).toBeNull();
  });

  it("updates selectedCityId and clears selectedPhases", () => {
    useMetroStore.getState().setPhases(["Phase 1"]);
    expect(useMetroStore.getState().selectedPhases).toEqual(["Phase 1"]);

    useMetroStore.getState().setSelectedCity("delhi");
    expect(useMetroStore.getState().selectedCityId).toBe("delhi");
    expect(useMetroStore.getState().selectedPhases).toEqual([]);
  });

  it("toggles status filters correctly", () => {
    // Initially all 3 are active
    expect(useMetroStore.getState().selectedStatuses.length).toBe(3);

    // Toggle off operational
    useMetroStore.getState().toggleStatus("operational");
    expect(useMetroStore.getState().selectedStatuses).toEqual([
      "construction",
      "planned",
    ]);

    // Toggle off construction
    useMetroStore.getState().toggleStatus("construction");
    expect(useMetroStore.getState().selectedStatuses).toEqual(["planned"]);

    // Attempting to toggle off the last remaining status should be prevented
    useMetroStore.getState().toggleStatus("planned");
    expect(useMetroStore.getState().selectedStatuses).toEqual(["planned"]);

    // Toggle operational back on
    useMetroStore.getState().toggleStatus("operational");
    expect(useMetroStore.getState().selectedStatuses).toEqual([
      "planned",
      "operational",
    ]);
  });

  it("toggles phase filters correctly", () => {
    useMetroStore.getState().togglePhase("I");
    expect(useMetroStore.getState().selectedPhases).toEqual(["I"]);

    useMetroStore.getState().togglePhase("IV");
    expect(useMetroStore.getState().selectedPhases).toEqual(["I", "IV"]);

    useMetroStore.getState().togglePhase("I");
    expect(useMetroStore.getState().selectedPhases).toEqual(["IV"]);
  });

  it("updates search query and resets all filters", () => {
    useMetroStore.getState().setSearchQuery("Yellow");
    useMetroStore.getState().setSelectedCity("delhi");
    useMetroStore.getState().toggleStatus("operational");

    expect(useMetroStore.getState().searchQuery).toBe("Yellow");
    expect(useMetroStore.getState().selectedCityId).toBe("delhi");

    useMetroStore.getState().resetFilters();
    const state = useMetroStore.getState();
    expect(state.selectedCityId).toBeNull();
    expect(state.selectedStatuses).toEqual([
      "operational",
      "construction",
      "planned",
    ]);
    expect(state.selectedPhases).toEqual([]);
    expect(state.searchQuery).toBe("");
  });

  it("manages selectedFeature state for segments and stations", () => {
    const mockSegment: SegmentProperties = {
      segment_id: "test-seg-1",
      line_id: "test-line",
      line_name: "Test Line",
      city: "Delhi",
      operator: "DMRC",
      status: "operational",
      phase: "I",
      length_km: 15.5,
      gauge: "standard",
      inaugurated_on: "2005-01-01",
      expected_completion: null,
      stations_count: 10,
      color: "#FFD700",
      source: "mock",
      last_verified: "2026-10-05",
    };

    useMetroStore.getState().setSelectedFeature({
      type: "segment",
      data: mockSegment,
    });
    expect(useMetroStore.getState().selectedFeature).toEqual({
      type: "segment",
      data: mockSegment,
    });

    const mockStation: StationProperties = {
      station_id: "test-station-1",
      name: "Test Station",
      city: "Delhi",
      line_ids: ["test-line"],
      status: "operational",
      phase: "I",
      is_interchange: false,
      opened_on: "2005-01-01",
      expected_completion: null,
      layout: "underground",
      source: "mock",
      last_verified: "2026-10-05",
    };

    useMetroStore.getState().setSelectedFeature({
      type: "station",
      data: mockStation,
    });
    expect(useMetroStore.getState().selectedFeature).toEqual({
      type: "station",
      data: mockStation,
    });

    useMetroStore.getState().clearSelectedFeature();
    expect(useMetroStore.getState().selectedFeature).toBeNull();
  });

  it("manages hoveredFeature state", () => {
    useMetroStore.getState().setHoveredFeature({
      type: "station",
      id: "del-rajiv-chowk",
      name: "Rajiv Chowk",
      status: "operational",
      x: 100,
      y: 200,
    });

    expect(useMetroStore.getState().hoveredFeature).toEqual({
      type: "station",
      id: "del-rajiv-chowk",
      name: "Rajiv Chowk",
      status: "operational",
      x: 100,
      y: 200,
    });

    useMetroStore.getState().setHoveredFeature(null);
    expect(useMetroStore.getState().hoveredFeature).toBeNull();
  });
});

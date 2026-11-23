import { describe, it, expect, beforeEach } from "vitest";
import {
  extractYear,
  computeCumulativeOperationalKm,
  countUndatedOperationalRecords,
  MIN_DATASET_YEAR,
  MAX_DATASET_YEAR,
} from "@/lib/timeline-utils";
import { buildStatusFilter, buildStationFilter } from "@/components/map/map-layers";
import { isVisible } from "@/lib/filter-utils";
import { matchesSegmentFilter } from "@/lib/filter-utils";
import { useMetroStore } from "@/store/use-metro-store";
import type { SegmentProperties, StationProperties } from "@/types/schema";

describe("Timeline Slider Utilities & Filtering (M13)", () => {
  beforeEach(() => {
    useMetroStore.getState().resetFilters();
  });

  describe("extractYear", () => {
    it("extracts 4-digit year from YYYY-MM-DD", () => {
      expect(extractYear("2002-12-25")).toBe(2002);
    });

    it("extracts 4-digit year from YYYY-MM", () => {
      expect(extractYear("2010-06")).toBe(2010);
    });

    it("extracts 4-digit year from YYYY", () => {
      expect(extractYear("1984")).toBe(1984);
    });

    it("returns null for null, undefined, or empty strings", () => {
      expect(extractYear(null)).toBeNull();
      expect(extractYear(undefined)).toBeNull();
      expect(extractYear("")).toBeNull();
      expect(extractYear("unknown")).toBeNull();
    });
  });

  describe("Boundary years & cumulative km calculation", () => {
    it("uses 1984 as min year and current year as max year", () => {
      expect(MIN_DATASET_YEAR).toBe(1984);
      expect(MAX_DATASET_YEAR).toBe(new Date().getFullYear());
    });

    it("computes cumulative km progressively by year", () => {
      const mockSegments: SegmentProperties[] = [
        {
          segment_id: "kol-line1",
          line_id: "kol-1",
          line_name: "Line 1",
          city: "Kolkata",
          city_id: "kolkata",
          operator: "Metro Railway",
          status: "operational",
          phase: "1",
          length_km: 10.5,
          gauge: "broad",
          inaugurated_on: "1984-10-24",
          expected_completion: null,
          stations_count: 5,
          color: "#0000FF",
          source: "osm",
          references: [],
          last_verified: "2026-01-01",
        },
        {
          segment_id: "del-red",
          line_id: "del-red",
          line_name: "Red Line",
          city: "Delhi",
          city_id: "delhi",
          operator: "DMRC",
          status: "operational",
          phase: "1",
          length_km: 8.3,
          gauge: "broad",
          inaugurated_on: "2002-12-25",
          expected_completion: null,
          stations_count: 6,
          color: "#FF0000",
          source: "osm",
          references: [],
          last_verified: "2026-01-01",
        },
      ];

      const points = computeCumulativeOperationalKm(mockSegments, 1984, 2005);
      const pt1984 = points.find((p) => p.year === 1984);
      const pt2001 = points.find((p) => p.year === 2001);
      const pt2002 = points.find((p) => p.year === 2002);
      const pt2005 = points.find((p) => p.year === 2005);

      expect(pt1984?.operationalKm).toBe(10.5);
      expect(pt2001?.operationalKm).toBe(10.5);
      expect(pt2002?.operationalKm).toBe(18.8); // 10.5 + 8.3
      expect(pt2005?.operationalKm).toBe(18.8);
    });
  });

  describe("Undated operational records handling", () => {
    it("correctly flags operational records without dates as undated", () => {
      const mockSegments: SegmentProperties[] = [
        {
          segment_id: "seg-1",
          line_id: "line-1",
          line_name: "Line 1",
          city: "City",
          city_id: "city",
          operator: "Op",
          status: "operational",
          phase: "1",
          length_km: 5.0,
          gauge: "standard",
          inaugurated_on: null, // undated!
          expected_completion: null,
          stations_count: 2,
          color: "#FF0000",
          source: "osm",
          references: [],
          last_verified: "2026-01-01",
        },
      ];

      const mockStations: StationProperties[] = [
        {
          station_id: "stn-1",
          name: "Station 1",
          city_id: "city",
          city: "City",
          line_ids: ["line-1"],
          status: "operational",
          phase: "1",
          is_interchange: false,
          opened_on: null, // undated!
          expected_completion: null,
          layout: "elevated",
          source: "osm",
          last_verified: "2026-01-01",
        },
        {
          station_id: "stn-2",
          name: "Station 2",
          city_id: "city",
          city: "City",
          line_ids: ["line-1"],
          status: "operational",
          phase: "1",
          is_interchange: false,
          opened_on: "2015-01-01",
          expected_completion: null,
          layout: "elevated",
          source: "osm",
          last_verified: "2026-01-01",
        },
      ];

      const counts = countUndatedOperationalRecords(mockSegments, mockStations);
      expect(counts.undatedOperationalSegments).toBe(1);
      expect(counts.undatedOperationalStations).toBe(1);
    });
  });

  describe("MapLibre Layer Filter Expressions", () => {
    it("buildStatusFilter includes date comparison for operational lines when year is selected", () => {
      const filter = buildStatusFilter(
        "operational",
        ["operational", "construction", "planned"],
        null,
        [],
        2010,
        true
      );

      expect(filter[0]).toBe("all");
      expect(JSON.stringify(filter)).toContain("<=");
      expect(JSON.stringify(filter)).toContain("2010-12-31");
    });

    describe("shared station and segment visibility predicate", () => {
      const options = {
        statuses: ["operational", "construction", "planned"] as const,
        cityId: "delhi",
        phases: [],
        year: 2020,
        includeFuture: false,
      };

      it("keeps undated operational records visible and hides future statuses", () => {
        expect(
          isVisible(
            { status: "operational", city_id: "delhi", inaugurated_on: null },
            options
          )
        ).toBe(true);
        expect(
          isVisible(
            { status: "construction", city_id: "delhi", inaugurated_on: null },
            options
          )
        ).toBe(false);
      });

      it("uses the same boundary for station opening and segment inauguration", () => {
        expect(
          isVisible(
            { status: "operational", city_id: "delhi", opened_on: "2020-01-01" },
            options
          )
        ).toBe(true);
        expect(
          isVisible(
            { status: "operational", city_id: "delhi", inaugurated_on: "2021-01-01" },
            options
          )
        ).toBe(false);
      });
    });

    it("buildStatusFilter hides construction lines when includeFuture is false and year is set", () => {
      const filter = buildStatusFilter(
        "construction",
        ["operational", "construction", "planned"],
        null,
        [],
        2015,
        false
      );

      expect(filter).toEqual(["==", ["get", "status"], "__NONE__"]);
    });

    it("buildStationFilter filters operational stations by year", () => {
      const filter = buildStationFilter(
        ["operational", "construction", "planned"],
        null,
        [],
        2012,
        false
      );

      expect(filter).toBeDefined();
      expect(JSON.stringify(filter)).toContain("2012-12-31");
    });
  });

  describe("matchesSegmentFilter with timeline criteria", () => {
    const baseSeg: SegmentProperties = {
      segment_id: "seg-test",
      line_id: "line-test",
      line_name: "Test Line",
      city: "Delhi",
      city_id: "delhi",
      operator: "DMRC",
      status: "operational",
      phase: "1",
      length_km: 12.0,
      gauge: "standard",
      inaugurated_on: "2006-11-11",
      expected_completion: null,
      stations_count: 8,
      color: "#FF0000",
      source: "osm",
      references: [],
      last_verified: "2026-01-01",
    };

    it("matches a legacy line alias supplied by the line metadata", () => {
      expect(
        matchesSegmentFilter(baseSeg, {
          activeCity: null,
          selectedStatuses: ["operational"],
          selectedPhases: [],
          searchQuery: "Silver Line",
          lineAliases: ["Silver Line"],
        })
      ).toBe(true);
    });

    it("matches segment when year is greater than or equal to inaugurated_on year", () => {
      expect(
        matchesSegmentFilter(baseSeg, {
          activeCity: null,
          selectedStatuses: ["operational"],
          selectedPhases: [],
          searchQuery: "",
          selectedYear: 2006,
        })
      ).toBe(true);

      expect(
        matchesSegmentFilter(baseSeg, {
          activeCity: null,
          selectedStatuses: ["operational"],
          selectedPhases: [],
          searchQuery: "",
          selectedYear: 2010,
        })
      ).toBe(true);
    });

    it("rejects segment when year is earlier than inaugurated_on year", () => {
      expect(
        matchesSegmentFilter(baseSeg, {
          activeCity: null,
          selectedStatuses: ["operational"],
          selectedPhases: [],
          searchQuery: "",
          selectedYear: 2005,
        })
      ).toBe(false);
    });

    it("handles includeFuture toggle for construction segments", () => {
      const constrSeg: SegmentProperties = {
        ...baseSeg,
        status: "construction",
        inaugurated_on: null,
      };

      // With includeFuture = true
      expect(
        matchesSegmentFilter(constrSeg, {
          activeCity: null,
          selectedStatuses: ["operational", "construction"],
          selectedPhases: [],
          searchQuery: "",
          selectedYear: 2005,
          includeFuture: true,
        })
      ).toBe(true);

      // With includeFuture = false
      expect(
        matchesSegmentFilter(constrSeg, {
          activeCity: null,
          selectedStatuses: ["operational", "construction"],
          selectedPhases: [],
          searchQuery: "",
          selectedYear: 2005,
          includeFuture: false,
        })
      ).toBe(false);
    });
  });

  describe("Zustand store timeline actions", () => {
    it("updates selectedYear and resets it with resetFilters", () => {
      useMetroStore.getState().setSelectedYear(2015);
      expect(useMetroStore.getState().selectedYear).toBe(2015);

      useMetroStore.getState().resetFilters();
      expect(useMetroStore.getState().selectedYear).toBeNull();
    });

    it("toggles play/pause state", () => {
      expect(useMetroStore.getState().isPlayingTimeline).toBe(false);

      useMetroStore.getState().togglePlayTimeline();
      expect(useMetroStore.getState().isPlayingTimeline).toBe(true);

      useMetroStore.getState().togglePlayTimeline();
      expect(useMetroStore.getState().isPlayingTimeline).toBe(false);
    });

    it("toggles includeFuture state", () => {
      expect(useMetroStore.getState().includeFuture).toBe(true);

      useMetroStore.getState().setIncludeFuture(false);
      expect(useMetroStore.getState().includeFuture).toBe(false);
    });
  });
});

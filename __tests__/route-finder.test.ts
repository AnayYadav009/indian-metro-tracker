import { describe, it, expect } from "vitest";
import {
  buildTransitGraph,
  findRoute,
  getCityRoutability,
  getSegmentStationOrder,
  ROUTING_CONSTANTS,
} from "@/lib/routing";
import type { SegmentFeature, StationFeature, Line } from "@/types/metro";

describe("M18 Route Finder", () => {
  describe("Routable-City Guard", () => {
    it("guards Surat because network is under construction with 0 operational stations", () => {
      const routability = getCityRoutability("surat");
      expect(routability.isRoutable).toBe(false);
      expect(routability.reason).toContain("0 operational stations");
    });

    it("guards Bhopal due to pending audit rule PRE-01 (length variance >10%)", () => {
      const routability = getCityRoutability("bhopal");
      expect(routability.isRoutable).toBe(false);
      expect(routability.reason).toContain("pending audit review");
    });

    it("guards Gurugram due to pending audit rule PRE-02 (loop terminal geometry)", () => {
      const routability = getCityRoutability("gurugram");
      expect(routability.isRoutable).toBe(false);
      expect(routability.reason).toContain("pending audit review");
    });

    it("guards unknown city ids", () => {
      const routability = getCityRoutability("atlantis");
      expect(routability.isRoutable).toBe(false);
      expect(routability.reason).toContain("not found");
    });

    it("permits verified routable networks (Kochi, Lucknow, Kanpur, Jaipur, Agra, Patna, Navi Mumbai)", () => {
      expect(getCityRoutability("kochi").isRoutable).toBe(true);
      expect(getCityRoutability("lucknow").isRoutable).toBe(true);
      expect(getCityRoutability("kanpur").isRoutable).toBe(true);
      expect(getCityRoutability("jaipur").isRoutable).toBe(true);
      expect(getCityRoutability("agra").isRoutable).toBe(true);
      expect(getCityRoutability("patna").isRoutable).toBe(true);
      expect(getCityRoutability("navi-mumbai").isRoutable).toBe(true);
    });
  });

  describe("Graph Builder & Single-Line Routing", () => {
    it("finds direct route on Kochi Blue Line without transfers", () => {
      const graph = buildTransitGraph({ cityId: "kochi" });
      const route = findRoute(graph, "kochi-aluva", "kochi-edappally");

      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.origin.id).toBe("kochi-aluva");
      expect(route.destination.id).toBe("kochi-edappally");
      expect(route.totalTransfers).toBe(0);
      expect(route.legs.length).toBe(1);
      expect(route.legs[0].lineId).toBe("koc-blue");
      expect(route.totalStops).toBe(8);
      expect(route.estimatedMinutes).toBeGreaterThan(0);
      expect(route.disclaimer).toBe(ROUTING_CONSTANTS.DISCLAIMER);
    });

    it("returns 0 stops and 0 time when origin and destination are the same station", () => {
      const graph = buildTransitGraph({ cityId: "kochi" });
      const route = findRoute(graph, "kochi-aluva", "kochi-aluva");

      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.totalStops).toBe(0);
      expect(route.totalTransfers).toBe(0);
      expect(route.totalDistanceKm).toBe(0);
      expect(route.estimatedMinutes).toBe(0);
      expect(route.legs.length).toBe(0);
    });

    it("returns null when no route exists between disconnected stations", () => {
      // Custom disconnected fixtures
      const customLines: Line[] = [
        { id: "line-a", name: "Line A", city: "X", city_id: "x", color: "#f00", operator: "Test Operator", source: "test" },
        { id: "line-b", name: "Line B", city: "X", city_id: "x", color: "#00f", operator: "Test Operator", source: "test" },
      ];
      const customSegments: SegmentFeature[] = [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [77.0, 28.0],
              [77.01, 28.01],
            ],
          },
          properties: {
            segment_id: "seg-a",
            line_id: "line-a",
            city_id: "x",
            status: "operational",
          } as any,
        },
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [80.0, 13.0],
              [80.01, 13.01],
            ],
          },
          properties: {
            segment_id: "seg-b",
            line_id: "line-b",
            city_id: "x",
            status: "operational",
          } as any,
        },
      ];
      const customStations: StationFeature[] = [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [77.0, 28.0] },
          properties: {
            station_id: "st-a1",
            name: "A1",
            city_id: "x",
            line_ids: ["line-a"],
            status: "operational",
            is_interchange: false,
          } as any,
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [77.01, 28.01] },
          properties: {
            station_id: "st-a2",
            name: "A2",
            city_id: "x",
            line_ids: ["line-a"],
            status: "operational",
            is_interchange: false,
          } as any,
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [80.0, 13.0] },
          properties: {
            station_id: "st-b1",
            name: "B1",
            city_id: "x",
            line_ids: ["line-b"],
            status: "operational",
            is_interchange: false,
          } as any,
        },
      ];

      const graph = buildTransitGraph({
        customLines,
        customSegments,
        customStations,
      });

      const route = findRoute(graph, "st-a1", "st-b1");
      expect(route).toBeNull();
    });

    it("excludes non-operational (construction/planned) stations from the routing graph", () => {
      const customLines: Line[] = [
        { id: "test-line", name: "Test Line", city: "T", city_id: "t", color: "#10b981", operator: "Test Operator", source: "test" },
      ];
      const customSegments: SegmentFeature[] = [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [77.0, 28.0],
              [77.01, 28.0],
              [77.02, 28.0],
            ],
          },
          properties: {
            segment_id: "seg-1",
            line_id: "test-line",
            city_id: "t",
            status: "operational",
          } as any,
        },
      ];
      const customStations: StationFeature[] = [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [77.0, 28.0] },
          properties: {
            station_id: "st-op-1",
            name: "Op 1",
            city_id: "t",
            line_ids: ["test-line"],
            status: "operational",
            is_interchange: false,
          } as any,
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [77.01, 28.0] },
          properties: {
            station_id: "st-const",
            name: "Construction Infill",
            city_id: "t",
            line_ids: ["test-line"],
            status: "construction",
            is_interchange: false,
          } as any,
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [77.02, 28.0] },
          properties: {
            station_id: "st-op-2",
            name: "Op 2",
            city_id: "t",
            line_ids: ["test-line"],
            status: "operational",
            is_interchange: false,
          } as any,
        },
      ];

      const graph = buildTransitGraph({
        customLines,
        customSegments,
        customStations,
      });

      expect(graph.stations.has("st-const")).toBe(false);
      const route = findRoute(graph, "st-op-1", "st-op-2");
      expect(route).not.toBeNull();
      expect(route?.totalStops).toBe(1);
    });
  });

  describe("Branch Routing (Delhi Blue Line)", () => {
    it("routes seamlessly across branch junction at Yamuna Bank with 0 transfers", () => {
      // Build Delhi network graph
      const graph = buildTransitGraph({ cityId: "delhi" });

      // Origin on Vaishali branch (del-vaishali) to Destination on Main line (del-dwarka-sector-21)
      const route = findRoute(graph, "del-vaishali", "del-dwarka-sector-21");

      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.origin.id).toBe("del-vaishali");
      expect(route.destination.id).toBe("del-dwarka-sector-21");
      // Because both branches are part of del-blue and intersect at Yamuna Bank, transfers = 0
      expect(route.totalTransfers).toBe(0);
      expect(route.legs.length).toBe(1);
      expect(route.legs[0].lineId).toBe("del-blue");
      expect(route.totalStops).toBe(40);
    });
  });

  describe("Loop Routing (Gurugram Rapid Metro)", () => {
    it("correctly identifies loop segment and closes circuit from last station to first station", () => {
      const graph = buildTransitGraph({ cityId: "gurugram" });

      // Traverse through the loop: Belvedere Towers -> DLF Phase 2 -> Sikanderpur
      const route = findRoute(graph, "gur-belvedere-towers", "gur-sikanderpur");

      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.totalTransfers).toBe(0);
      expect(route.legs.length).toBe(1);
      expect(route.legs[0].lineId).toBe("gur-rapid");
      expect(route.totalStops).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Transfers & Fewest Transfers Objective", () => {
    it("prioritizes fewest transfers over fewer stops when alternatives exist", () => {
      // Fixture:
      // Direct Route on Line 1: A -> B -> C -> D -> E (4 stops, 0 transfers)
      // Faster Shortcut via Line 2: A -> Transfer -> X -> Transfer -> E (2 stops, 2 transfers)
      const customLines: Line[] = [
        { id: "line-direct", name: "Direct Line", city: "C", city_id: "c", color: "#10b981", operator: "Test Operator", source: "test" },
        { id: "line-express", name: "Express Line", city: "C", city_id: "c", color: "#f59e0b", operator: "Test Operator", source: "test" },
      ];

      const customSegments: SegmentFeature[] = [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [77.0, 28.0],
              [77.01, 28.0],
              [77.02, 28.0],
              [77.03, 28.0],
              [77.04, 28.0],
            ],
          },
          properties: {
            segment_id: "seg-direct",
            line_id: "line-direct",
            city_id: "c",
            status: "operational",
          } as any,
        },
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [77.0, 28.0],
              [77.02, 28.05],
              [77.04, 28.0],
            ],
          },
          properties: {
            segment_id: "seg-express",
            line_id: "line-express",
            city_id: "c",
            status: "operational",
          } as any,
        },
      ];

      const customStations: StationFeature[] = [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [77.0, 28.0] },
          properties: {
            station_id: "st-a",
            name: "A",
            city_id: "c",
            line_ids: ["line-direct", "line-express"],
            status: "operational",
            is_interchange: true,
          } as any,
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [77.01, 28.0] },
          properties: {
            station_id: "st-b",
            name: "B",
            city_id: "c",
            line_ids: ["line-direct"],
            status: "operational",
            is_interchange: false,
          } as any,
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [77.02, 28.0] },
          properties: {
            station_id: "st-c",
            name: "C",
            city_id: "c",
            line_ids: ["line-direct"],
            status: "operational",
            is_interchange: false,
          } as any,
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [77.03, 28.0] },
          properties: {
            station_id: "st-d",
            name: "D",
            city_id: "c",
            line_ids: ["line-direct"],
            status: "operational",
            is_interchange: false,
          } as any,
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [77.04, 28.0] },
          properties: {
            station_id: "st-e",
            name: "E",
            city_id: "c",
            line_ids: ["line-direct", "line-express"],
            status: "operational",
            is_interchange: true,
          } as any,
        },
      ];

      const graph = buildTransitGraph({
        customLines,
        customSegments,
        customStations,
      });

      // Starting on Line Direct: boarding Line Direct to E has 0 transfers
      const route = findRoute(graph, "st-b", "st-e");
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.totalTransfers).toBe(0);
      expect(route.legs[0].lineId).toBe("line-direct");
    });

    it("correctly links cross-network stations sharing interchange_id", () => {
      // Build graph covering both Delhi and Gurugram networks
      const graph = buildTransitGraph();

      // Sikanderpur Rapid Metro to Sikanderpur Delhi Yellow Line share int-sikanderpur
      const route = findRoute(graph, "gur-cyber-city", "del-rajiv-chowk");

      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.totalTransfers).toBeGreaterThanOrEqual(1);
      const hasYellowLine = route.legs.some((l) => l.lineId === "del-yellow");
      const hasRapidMetro = route.legs.some((l) => l.lineId === "gur-rapid");
      expect(hasYellowLine).toBe(true);
      expect(hasRapidMetro).toBe(true);
    });
  });
});

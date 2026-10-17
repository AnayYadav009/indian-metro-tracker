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

    it("permits verified routable networks (Kochi, Lucknow, Kanpur, Jaipur, Agra, Navi Mumbai, Patna)", () => {
      expect(getCityRoutability("kochi").isRoutable).toBe(true);
      expect(getCityRoutability("lucknow").isRoutable).toBe(true);
      expect(getCityRoutability("kanpur").isRoutable).toBe(true);
      expect(getCityRoutability("jaipur").isRoutable).toBe(true);
      expect(getCityRoutability("agra").isRoutable).toBe(true);
      expect(getCityRoutability("navi-mumbai").isRoutable).toBe(true);
      expect(getCityRoutability("patna").isRoutable).toBe(true);
    });

    it("routes seamlessly on Patna Blue Line priority corridor (New ISBT to Malahi Pakri)", () => {
      const graph = buildTransitGraph({ cityId: "patna" });
      const route = findRoute(graph, "patna-new-isbt", "patna-malahi-pakri");
      expect(route).not.toBeNull();
      expect(route?.totalStops).toBe(4);
      expect(route?.totalTransfers).toBe(0);
      expect(route?.legs[0].lineId).toBe("pat-blue");
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
      // Build Delhi Blue Line graph
      const graph = buildTransitGraph({ cityId: "delhi", allowedLineIds: ["del-blue"] });

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
      const graph = buildTransitGraph({ cityId: "gurugram", includeGuardedLines: true });

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

    it("prioritizes shorter estimated time over fewest transfers when express transfer route is significantly faster", () => {
      const graph = buildTransitGraph({ cityId: "delhi", includeGuardedLines: true });
      const route = findRoute(graph, "del-vaishali", "del-dwarka-sector-21");

      expect(route).not.toBeNull();
      if (!route) return;

      // Faster route via Airport Express takes approx 92 min (2 transfers) instead of direct Blue Line (102 min, 0 transfers)
      expect(route.estimatedMinutes).toBeLessThan(100);
      expect(route.legs.some((l) => l.lineId === "del-airport")).toBe(true);
    });

    it("correctly links cross-network stations sharing interchange_id", () => {
      // Build graph covering both Delhi and Gurugram networks
      const graph = buildTransitGraph({ includeGuardedLines: true });

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

  describe("Tier 1 Multi-Transfer Routes & Topological Edge Cases", () => {
    function findStation(
      graph: ReturnType<typeof buildTransitGraph>,
      nameQuery: string
    ) {
      const q = nameQuery.toLowerCase();
      const st = Array.from(graph.stations.values()).find((s) =>
        s.name.toLowerCase().includes(q)
      );
      if (!st) {
        throw new Error(
          `Station query "${nameQuery}" not found in graph stations: ${Array.from(graph.stations.values()).map((s) => s.name).join(", ")}`
        );
      }
      return st;
    }

    it("Delhi: finds multi-transfer route between Blue Line and Red Line asserting stops and transfers from compiled legs", () => {
      const graph = buildTransitGraph({ cityId: "delhi" });
      const fromSt = findStation(graph, "Dwarka Sector 21");
      const toSt = findStation(graph, "Shaheed Sthal");

      const route = findRoute(graph, fromSt.id, toSt.id);
      expect(route).not.toBeNull();
      if (!route) return;

      // Assertions derived dynamically from compiled legs and transfers
      expect(route.totalTransfers).toBeGreaterThanOrEqual(1);
      expect(route.totalTransfers).toBe(route.legs.length - 1);
      expect(route.totalStops).toBe(
        route.legs.reduce((acc, leg) => acc + leg.stopCount, 0)
      );
      expect(route.totalDistanceKm).toBe(
        Number(route.legs.reduce((acc, leg) => acc + leg.distanceKm, 0).toFixed(2))
      );
      expect(route.origin.id).toBe(fromSt.id);
      expect(route.destination.id).toBe(toSt.id);
      expect(route.legs[0].fromStation.id).toBe(fromSt.id);
      expect(route.legs[route.legs.length - 1].toStation.id).toBe(toSt.id);
    });

    it("Mumbai: finds multi-transfer route between Line 1 (Blue) and Line 3 (Aqua) asserting stops from compiled legs", () => {
      const graph = buildTransitGraph({ cityId: "mumbai" });
      const fromSt = findStation(graph, "Andheri");
      const toSt = findStation(graph, "Aarey JVLR");

      const route = findRoute(graph, fromSt.id, toSt.id);
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.totalTransfers).toBeGreaterThanOrEqual(1);
      expect(route.totalTransfers).toBe(route.legs.length - 1);
      expect(route.totalStops).toBe(
        route.legs.reduce((acc, leg) => acc + leg.stopCount, 0)
      );
      expect(route.legs.map((l) => l.lineId)).toEqual(
        expect.arrayContaining(["mum-line-1", "mum-line-3"])
      );
    });

    it("Bengaluru: finds multi-transfer route between Purple Line and Green Line asserting stops from compiled legs", () => {
      const graph = buildTransitGraph({ cityId: "bengaluru" });
      const fromSt = findStation(graph, "Kadugodi");
      const toSt = findStation(graph, "Nagasandra");

      const route = findRoute(graph, fromSt.id, toSt.id);
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.totalTransfers).toBeGreaterThanOrEqual(1);
      expect(route.totalTransfers).toBe(route.legs.length - 1);
      expect(route.totalStops).toBe(
        route.legs.reduce((acc, leg) => acc + leg.stopCount, 0)
      );
      expect(route.legs.map((l) => l.lineId)).toEqual(
        expect.arrayContaining(["blr-purple", "blr-green"])
      );
    });

    it("Chennai: finds multi-transfer route between Blue Line and Green Line asserting stops from compiled legs", () => {
      const graph = buildTransitGraph({ cityId: "chennai" });
      const fromSt = findStation(graph, "Wimco Nagar");
      const toSt = findStation(graph, "Koyambedu");

      const route = findRoute(graph, fromSt.id, toSt.id);
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.totalTransfers).toBeGreaterThanOrEqual(1);
      expect(route.totalTransfers).toBe(route.legs.length - 1);
      expect(route.totalStops).toBe(
        route.legs.reduce((acc, leg) => acc + leg.stopCount, 0)
      );
      expect(route.legs.map((l) => l.lineId)).toEqual(
        expect.arrayContaining(["che-blue", "che-green"])
      );
    });

    it("Hyderabad: finds multi-transfer route between Red Line and Blue Line asserting stops from compiled legs", () => {
      const graph = buildTransitGraph({ cityId: "hyderabad" });
      const fromSt = findStation(graph, "Miyapur");
      const toSt = findStation(graph, "Nagole");

      const route = findRoute(graph, fromSt.id, toSt.id);
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.totalTransfers).toBeGreaterThanOrEqual(1);
      expect(route.totalTransfers).toBe(route.legs.length - 1);
      expect(route.totalStops).toBe(
        route.legs.reduce((acc, leg) => acc + leg.stopCount, 0)
      );
      expect(route.legs.map((l) => l.lineId)).toEqual(
        expect.arrayContaining(["hyd-red", "hyd-blue"])
      );
    });

    it("Kolkata: finds multi-transfer route between Blue Line and Green Line asserting stops from compiled legs", () => {
      const graph = buildTransitGraph({ cityId: "kolkata" });
      const fromSt = findStation(graph, "Kavi Subhash");
      const toSt = findStation(graph, "Howrah Maidan");

      const route = findRoute(graph, fromSt.id, toSt.id);
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.totalTransfers).toBeGreaterThanOrEqual(1);
      expect(route.totalTransfers).toBe(route.legs.length - 1);
      expect(route.totalStops).toBe(
        route.legs.reduce((acc, leg) => acc + leg.stopCount, 0)
      );
      expect(route.legs.map((l) => l.lineId)).toEqual(
        expect.arrayContaining(["kol-blue", "kol-green"])
      );
    });

    it("Branch Route: traverses Delhi Blue Line branch (Vaishali to Dwarka Sector 21) via Yamuna Bank on Blue Line with 0 line transfers", () => {
      const graph = buildTransitGraph({ cityId: "delhi", allowedLineIds: ["del-blue"] });
      const fromSt = findStation(graph, "Vaishali");
      const toSt = findStation(graph, "Dwarka Sector 21");

      const route = findRoute(graph, fromSt.id, toSt.id);
      expect(route).not.toBeNull();
      if (!route) return;

      expect(route.totalTransfers).toBe(0);
      expect(route.legs.length).toBe(1);
      expect(route.legs[0].lineId).toBe("del-blue");
      expect(route.legs[0].fromStation.id).toBe(fromSt.id);
      expect(route.legs[0].toStation.id).toBe(toSt.id);
      expect(
        route.legs[0].intermediateStations.some((s) =>
          s.name.toLowerCase().includes("yamuna bank")
        )
      ).toBe(true);
      expect(route.totalStops).toBe(route.legs[0].stopCount);
    });

    it("No-Route Case: returns null between disconnected components in Mumbai (Chembur on Line 2B to Andheri on Line 1)", () => {
      const graph = buildTransitGraph({ cityId: "mumbai" });
      const fromSt = findStation(graph, "Chembur");
      const toSt = findStation(graph, "Andheri");

      const route = findRoute(graph, fromSt.id, toSt.id);
      expect(route).toBeNull();
    });
  });

  describe("Tier 1 Verified Interchanges Regression Suite", () => {
    it("Delhi: Kashmere Gate links Red, Yellow, and Violet lines (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "delhi" });
      const route = findRoute(graph, "del-tis-hazari", "del-lal-quila");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.transfers[0].station.id).toBe("del-kashmere-gate");
    });

    it("Delhi: Rajiv Chowk links Blue and Yellow lines (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "delhi" });
      const route = findRoute(graph, "del-r-k-ashram-marg", "del-patel-chowk");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.transfers[0].station.id).toBe("del-rajiv-chowk");
    });

    it("Delhi: Mandi House links Blue and Violet lines (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "delhi" });
      const route = findRoute(graph, "del-supreme-court", "del-ito");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.transfers[0].station.id).toBe("del-mandi-house");
    });

    it("Delhi: Central Secretariat links Yellow and Violet lines (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "delhi" });
      const route = findRoute(graph, "del-udyog-bhawan", "del-khan-market");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.transfers[0].station.id).toBe("del-central-secretariat");
    });

    it("Delhi: Rithala to Raja Nahar Singh needs exactly 1 transfer via Violet link", () => {
      const graph = buildTransitGraph({ cityId: "delhi" });
      const route = findRoute(graph, "del-rithala", "del-raja-nahar-singh");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.transfers[0].station.id).toBe("del-kashmere-gate");
      expect(route?.legs[0].lineId).toBe("del-red");
      expect(route?.legs[1].lineId).toBe("del-violet");
    });

    it("Mumbai: Western Express Highway and Gundavali link Line 1 and Line 7 (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "mumbai" });
      const route = findRoute(graph, "mum-chakala-jb-nagar", "mum-mogra");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.legs[0].lineId).toBe("mum-line-1");
      expect(route?.legs[1].lineId).toBe("mum-line-7");
    });

    it("Mumbai: D.N. Nagar and Andheri West link Line 1 and Line 2A (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "mumbai" });
      const route = findRoute(graph, "mum-azad-nagar", "mum-lower-oshiwara");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.legs[0].lineId).toBe("mum-line-1");
      expect(route?.legs[1].lineId).toBe("mum-line-2a");
    });

    it("Mumbai: Marol Naka links Line 1 and Line 3 (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "mumbai" });
      const route = findRoute(graph, "mum-saki-naka", "mum-csmia-international-t2");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.transfers[0].station.id).toBe("mum-marol-naka");
    });

    it("Mumbai: Dahisar East links Line 2A and Line 7 (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "mumbai" });
      const route = findRoute(graph, "mum-anand-nagar", "mum-ovaripada");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.transfers[0].station.id).toBe("mum-dahisar-east");
    });

    it("Chennai: Chennai Central links Blue and Green lines (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "chennai" });
      const route = findRoute(graph, "chennai-high-court", "chennai-egmore");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.transfers[0].station.id).toBe("chennai-chennai-central");
    });

    it("Chennai: Alandur links Blue and Green lines (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "chennai" });
      const route = findRoute(graph, "chennai-meenambakkam", "chennai-st-thomas-mount");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.transfers[0].station.id).toBe("chennai-alandur");
    });

    it("Hyderabad: Ameerpet links Blue and Red lines (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "hyderabad" });
      const route = findRoute(graph, "hyderabad-madhura-nagar", "hyderabad-sr-nagar");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.transfers[0].station.id).toBe("hyderabad-ameerpet");
    });

    it("Hyderabad: MG Bus Station links Red and Green lines (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "hyderabad" });
      const route = findRoute(graph, "hyderabad-malakpet", "hyderabad-sultan-bazar");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.transfers[0].station.id).toBe("hyderabad-mg-bus-station");
    });

    it("Hyderabad: Raidurg to Secunderabad West uses Parade Ground / JBS link (exactly 1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "hyderabad" });
      const route = findRoute(graph, "hyderabad-raidurg", "hyderabad-secunderabad-west");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.legs.length).toBe(2);
      expect(route?.legs[0].lineId).toBe("hyd-blue");
      expect(route?.legs[1].lineId).toBe("hyd-green");
    });

    it("Kolkata: Esplanade links Blue and Green lines (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "kolkata" });
      const route = findRoute(graph, "kolkata-chandni-chowk", "kolkata-howrah");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.transfers[0].station.id).toBe("kolkata-esplanade");
    });

    it("Kolkata: Kavi Subhash links Blue and Orange lines (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "kolkata" });
      const route = findRoute(graph, "kolkata-shahid-khudiram", "kolkata-satyajit-roy");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.transfers[0].station.id).toBe("kolkata-kavi-subhash");
    });

    it("Bengaluru: Majestic links Purple and Green lines (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "bengaluru" });
      const route = findRoute(graph, "blr-sir-m-visvesvaraya-stn-central-college", "blr-chickpete");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.transfers[0].station.id).toBe("blr-nadaprabhu-kempegowda-majestic");
    });

    it("Bengaluru: RV Road links Green and Yellow lines (1 transfer)", () => {
      const graph = buildTransitGraph({ cityId: "bengaluru" });
      const route = findRoute(graph, "blr-banashankari", "blr-jayadeva-hospital");
      expect(route).not.toBeNull();
      expect(route?.totalTransfers).toBe(1);
      expect(route?.transfers[0].station.id).toBe("blr-rashtreeya-vidyalaya-road");
    });
  });

  describe("Guarded Lines Graph Exclusion", () => {
    it("guarded lines (Airport Express, Green, Pink, Magenta, Gurugram, Bhopal) are excluded from the graph and cannot be used in routes", () => {
      const delhiGraph = buildTransitGraph({ cityId: "delhi" });
      const guardedLineIds = [
        "del-airport",
        "del-green",
        "del-pink",
        "del-magenta",
        "gur-rapid",
        "bho-orange",
      ];

      // 1. None of the guarded lines exist in graph.lines
      for (const lineId of guardedLineIds) {
        expect(delhiGraph.lines.has(lineId)).toBe(false);
      }

      // 2. No node or edge in graph.adj uses any guarded line
      for (const [nodeKey, edges] of delhiGraph.adj.entries()) {
        const [, lineId] = nodeKey.split("::");
        expect(guardedLineIds).not.toContain(lineId);
        for (const edge of edges) {
          expect(guardedLineIds).not.toContain(edge.fromLineId);
          expect(guardedLineIds).not.toContain(edge.toLineId);
          expect(guardedLineIds).not.toContain(edge.lineId);
        }
      }

      // 3. Test multiple cross-city routes and assert no leg uses any guarded line
      const routesToTest = [
        findRoute(delhiGraph, "del-rithala", "del-raja-nahar-singh"),
        findRoute(delhiGraph, "del-vaishali", "del-dwarka-sector-21"),
        findRoute(delhiGraph, "del-samaypur-badli", "del-millennium-city-centre-gurugram"),
        findRoute(delhiGraph, "del-dwarka", "del-dhansa-bus-stand"),
      ];
      for (const route of routesToTest) {
        expect(route).not.toBeNull();
        for (const leg of route!.legs) {
          expect(guardedLineIds).not.toContain(leg.lineId);
        }
      }

      // 4. Stations that only belong to guarded lines cannot be routed to/from
      const dhaulaKuanRoute = findRoute(delhiGraph, "del-new-delhi", "del-dhaula-kuan");
      expect(dhaulaKuanRoute).toBeNull();

      // 5. Gurugram and Bhopal default graphs have 0 operational routable lines
      const gurugramGraph = buildTransitGraph({ cityId: "gurugram" });
      expect(gurugramGraph.lines.size).toBe(0);

      const bhopalGraph = buildTransitGraph({ cityId: "bhopal" });
      expect(bhopalGraph.lines.size).toBe(0);
    });
  });
});


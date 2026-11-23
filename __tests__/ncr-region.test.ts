import { describe, it, expect } from "vitest";
import { NCR_REGION, getRegion, isRegionId, getRegionMemberCityIds } from "@/lib/regions";
import { buildFilterCriteria, matchesSegmentFilter, buildVisibilityExpression, isVisible } from "@/lib/filter-utils";
import { buildTransitGraph, findRoute } from "@/lib/routing/graph";
import { getMetroData } from "@/lib/data";

describe("Stage 12E: NCR Combined Regional View & Routing", () => {
  const dataset = getMetroData();

  describe("NCR Region Model & Bounding Box", () => {
    it("defines NCR region with all 5 member systems", () => {
      expect(NCR_REGION.id).toBe("ncr");
      expect(NCR_REGION.name).toBe("National Capital Region (NCR)");
      expect(NCR_REGION.memberCityIds).toEqual([
        "delhi",
        "gurugram",
        "noida",
        "meerut",
        "namo-bharat",
      ]);
      expect(isRegionId("ncr")).toBe(true);
      expect(isRegionId("delhi")).toBe(false);
      expect(getRegion("ncr")).toBeDefined();
      expect(getRegionMemberCityIds("ncr")).toHaveLength(5);
    });

    it("ensures NCR bounding box envelops all member systems' stations", () => {
      const [minLng, minLat, maxLng, maxLat] = NCR_REGION.bbox;
      const ncrMemberIds = new Set(NCR_REGION.memberCityIds);
      const ncrStations = dataset.stations.features.filter((s) =>
        ncrMemberIds.has(s.properties.city_id)
      );

      expect(ncrStations.length).toBeGreaterThan(250);

      for (const st of ncrStations) {
        const [lng, lat] = st.geometry.coordinates;
        expect(lng).toBeGreaterThanOrEqual(minLng - 0.05);
        expect(lng).toBeLessThanOrEqual(maxLng + 0.05);
        expect(lat).toBeGreaterThanOrEqual(minLat - 0.05);
        expect(lat).toBeLessThanOrEqual(maxLat + 0.05);
      }
    });
  });

  describe("Filter & Visibility Expressions for NCR", () => {
    it("generates MapLibre 'in' filter condition for region city_ids", () => {
      const expr = buildVisibilityExpression("operational", {
        cityId: "ncr",
        phases: [],
        year: null,
        includeFuture: true,
      });

      expect(expr).toContainEqual([
        "in",
        ["get", "city_id"],
        ["literal", ["delhi", "gurugram", "noida", "meerut", "namo-bharat"]],
      ]);
    });

    it("matches segments from all 5 NCR systems and filters out other cities", () => {
      const criteria = buildFilterCriteria(
        dataset,
        "ncr",
        ["operational", "construction"],
        [],
        ""
      );

      const delhiSeg = dataset.segments.features.find((s) => s.properties.city_id === "delhi")!;
      const noidaSeg = dataset.segments.features.find((s) => s.properties.city_id === "noida")!;
      const namoSeg = dataset.segments.features.find((s) => s.properties.city_id === "namo-bharat")!;
      const blrSeg = dataset.segments.features.find((s) => s.properties.city_id === "bengaluru")!;

      expect(matchesSegmentFilter(delhiSeg.properties, criteria)).toBe(true);
      expect(matchesSegmentFilter(noidaSeg.properties, criteria)).toBe(true);
      expect(matchesSegmentFilter(namoSeg.properties, criteria)).toBe(true);
      expect(matchesSegmentFilter(blrSeg.properties, criteria)).toBe(false);
    });
  });

  describe("Cross-System Transit Graph & Routing", () => {
    it("builds a unified transit graph containing lines from across NCR", () => {
      const graph = buildTransitGraph({ cityId: "ncr" });

      expect(graph.stations.size).toBeGreaterThan(150);
      expect(graph.lines.has("del-yellow")).toBe(true);
      expect(graph.lines.has("noi-aqua")).toBe(true);
      expect(graph.lines.has("namo-delhi-meerut")).toBe(true);
    });

    it("verifies inter-system transfer edge between Delhi Metro and Noida Metro at Sector 51/52", () => {
      const graph = buildTransitGraph({ cityId: "ncr" });

      // del-noida-sector-52 (del-blue) -> noi-noida-sector-51 (noi-aqua)
      const nodeA = "del-noida-sector-52::del-blue";
      const edgesFromA = graph.adj.get(nodeA) || [];
      const transferToNoida = edgesFromA.find(
        (e) => e.toStationId === "noi-noida-sector-51" && e.isTransfer
      );

      expect(transferToNoida).toBeDefined();
      expect(transferToNoida?.toLineId).toBe("noi-aqua");
    });

    it("verifies inter-system transfer edge between Delhi Metro and Rapid Metro at Sikanderpur", () => {
      const graph = buildTransitGraph({ cityId: "ncr", includeGuardedLines: true });

      const nodeDelhi = "del-sikanderpur::del-yellow";
      const edges = graph.adj.get(nodeDelhi) || [];
      const transferToGurugram = edges.find(
        (e) => e.toStationId === "gur-sikanderpur" && e.isTransfer
      );

      expect(transferToGurugram).toBeDefined();
      expect(transferToGurugram?.toLineId).toBe("gur-rapid");
    });

    it("verifies inter-system transfer edge between Delhi Metro and Namo Bharat at Anand Vihar", () => {
      const graph = buildTransitGraph({ cityId: "ncr" });

      const nodeBlue = "del-anand-vihar::del-blue";
      const edges = graph.adj.get(nodeBlue) || [];
      const transferToNamo = edges.find(
        (e) => e.toStationId === "namo-anand-vihar" && e.isTransfer
      );

      expect(transferToNamo).toBeDefined();
      expect(transferToNamo?.toLineId).toBe("namo-delhi-meerut");
    });

    it("verifies the 5 required route scenarios: Delhi-Noida, Delhi-Gurugram, Gurugram-Noida, Delhi-Meerut, and an unreachable pair", () => {
      const graph = buildTransitGraph({ cityId: "ncr", includeGuardedLines: true });

      // 1. Delhi to Noida
      const r1 = findRoute(graph, "del-rajiv-chowk", "noi-noida-sector-51");
      expect(r1).not.toBeNull();
      console.log("Delhi -> Noida:", r1?.legs.map(l => `${l.fromStation.name} to ${l.toStation.name} via ${l.lineId}`));

      // 2. Delhi to Gurugram
      const r2 = findRoute(graph, "del-hauz-khas", "gur-cyber-city");
      expect(r2).not.toBeNull();
      console.log("Delhi -> Gurugram:", r2?.legs.map(l => `${l.fromStation.name} to ${l.toStation.name} via ${l.lineId}`));

      // 3. Gurugram to Noida
      const r3 = findRoute(graph, "gur-cyber-city", "noi-noida-sector-51");
      expect(r3).not.toBeNull();
      console.log("Gurugram -> Noida:", r3?.legs.map(l => `${l.fromStation.name} to ${l.toStation.name} via ${l.lineId}`));

      // 4. Delhi to Meerut
      const r4 = findRoute(graph, "del-rajiv-chowk", "namo-meerut-south");
      expect(r4).not.toBeNull();
      console.log("Delhi -> Meerut:", r4?.legs.map(l => `${l.fromStation.name} to ${l.toStation.name} via ${l.lineId}`));

      // 5. Unreachable pair
      const r5 = findRoute(graph, "del-rajiv-chowk", "blr-nadaprabhu-kempegowda-majestic");
      expect(r5).toBeNull();
      console.log("Delhi -> Bengaluru unreachable:", r5 === null);
    });

    it("plans a multi-system route from Noida Aqua Line to Delhi Rajiv Chowk via Blue Line transfer", () => {
      const graph = buildTransitGraph({ cityId: "ncr" });

      const route = findRoute(graph, "noi-noida-sector-76", "del-rajiv-chowk");
      expect(route).not.toBeNull();
      expect(route?.origin.id).toBe("noi-noida-sector-76");
      expect(route?.destination.id).toBe("del-rajiv-chowk");
      expect(route?.totalTransfers).toBeGreaterThanOrEqual(1);

      const transferStations = (route?.transfers || []).map((t) => t.station.id);
      expect(
        transferStations.includes("noi-noida-sector-51") ||
        transferStations.includes("del-noida-sector-52")
      ).toBe(true);
    });

    it("plans a multi-system route from Delhi to Meerut South via Red Line and Namo Bharat RRTS", () => {
      const graph = buildTransitGraph({ cityId: "ncr" });

      const route = findRoute(graph, "del-kashmere-gate", "namo-meerut-south");
      expect(route).not.toBeNull();
      expect(route?.origin.id).toBe("del-kashmere-gate");
      expect(route?.destination.id).toBe("namo-meerut-south");
      expect(route?.totalTransfers).toBeGreaterThanOrEqual(1);

      const linesUsed = (route?.legs || []).map((l) => l.lineId);
      expect(linesUsed).toContain("namo-delhi-meerut");
    });

    it("reaches an Aqua Line station from Delhi (Rajiv Chowk) with exact legs, transfers and line IDs", () => {
      const graph = buildTransitGraph({ cityId: "ncr" });
      const route = findRoute(graph, "del-rajiv-chowk", "noi-noida-sector-76");
      expect(route).not.toBeNull();
      expect(route?.origin.id).toBe("del-rajiv-chowk");
      expect(route?.destination.id).toBe("noi-noida-sector-76");

      console.log("=== Delhi (Rajiv Chowk) -> Noida (Sector 76) Route Details ===");
      console.log("Transfers:", route?.transfers.map(t => `${t.station.name} (${t.fromLineId} -> ${t.toLineId})`));
      console.log("Legs:");
      route?.legs.forEach((leg, i) => {
        console.log(`  Leg ${i + 1}: ${leg.fromStation.name} -> ${leg.toStation.name} [Line: ${leg.lineId}] (${leg.stopCount} stops)`);
      });
      expect(route?.legs.map(l => l.lineId)).toEqual(["del-blue", "noi-aqua"]);
    });

    it("reaches an Aqua Line station from Gurugram (Cyber City) with exact legs, transfers and line IDs", () => {
      const graph = buildTransitGraph({ cityId: "ncr", includeGuardedLines: true });
      const route = findRoute(graph, "gur-cyber-city", "noi-noida-sector-76");
      expect(route).not.toBeNull();
      expect(route?.origin.id).toBe("gur-cyber-city");
      expect(route?.destination.id).toBe("noi-noida-sector-76");

      console.log("=== Gurugram (Cyber City) -> Noida (Sector 76) Route Details ===");
      console.log("Transfers:", route?.transfers.map(t => `${t.station.name} (${t.fromLineId} -> ${t.toLineId})`));
      console.log("Legs:");
      route?.legs.forEach((leg, i) => {
        console.log(`  Leg ${i + 1}: ${leg.fromStation.name} -> ${leg.toStation.name} [Line: ${leg.lineId}] (${leg.stopCount} stops)`);
      });
      expect(route?.legs.map(l => l.lineId)).toEqual(["gur-rapid", "del-yellow", "del-magenta", "del-blue", "noi-aqua"]);
    });
  });
});

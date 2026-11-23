import { describe, it, expect } from "vitest";
import {
  operationalLineLayer,
  constructionLineLayer,
  plannedLineLayer,
  stationCircleLayer,
  stationLabelsLayer,
} from "@/components/map/map-layers";

describe("MapLibre Layer Specifications", () => {
  describe("Line status visual discrimination without relying on color", () => {
    it("configures operationalLayer as a solid line", () => {
      const layer = operationalLineLayer as Record<string, any>;
      expect(layer.id).toBe("operational-lines");
      expect(layer.type).toBe("line");
      expect(layer.source).toBe("metro-segments");
      expect(layer.filter).toEqual([
        "==",
        ["get", "status"],
        "operational",
      ]);
      // Solid line has NO line-dasharray
      expect(layer.paint?.["line-dasharray"]).toBeUndefined();
      expect(layer.paint?.["line-color"]).toEqual(["get", "color"]);
    });

    it("configures constructionLayer as a dashed line with [4, 2]", () => {
      const layer = constructionLineLayer as Record<string, any>;
      expect(layer.id).toBe("construction-lines");
      expect(layer.type).toBe("line");
      expect(layer.source).toBe("metro-segments");
      expect(layer.filter).toEqual([
        "==",
        ["get", "status"],
        "construction",
      ]);
      expect(layer.paint?.["line-dasharray"]).toEqual([4, 2]);
      expect(layer.paint?.["line-color"]).toEqual(["get", "color"]);
    });

    it("configures plannedLayer as a dotted line with [0.1, 2] and round cap", () => {
      const layer = plannedLineLayer as Record<string, any>;
      expect(layer.id).toBe("planned-lines");
      expect(layer.type).toBe("line");
      expect(layer.source).toBe("metro-segments");
      expect(layer.filter).toEqual([
        "==",
        ["get", "status"],
        "planned",
      ]);
      expect(layer.paint?.["line-dasharray"]).toEqual([0.1, 2]);
      expect(layer.paint?.["line-color"]).toEqual(["get", "color"]);
      expect(layer.layout?.["line-cap"]).toBe("round");
    });
  });

  describe("Station layers", () => {
    it("configures stationCircleLayer with distinct styling for interchange", () => {
      const layer = stationCircleLayer as Record<string, any>;
      expect(layer.id).toBe("station-points");
      expect(layer.type).toBe("circle");
      expect(layer.source).toBe("metro-stations");
      expect(layer.paint?.["circle-radius"]).toBeDefined();
      expect(layer.paint?.["circle-stroke-width"]).toBeDefined();
    });

    it("configures stationLabelsLayer as symbol layer with zoom threshold", () => {
      const layer = stationLabelsLayer as Record<string, any>;
      expect(layer.id).toBe("station-labels");
      expect(layer.type).toBe("symbol");
      expect(layer.minzoom).toBe(11.5);
    });
  });
});

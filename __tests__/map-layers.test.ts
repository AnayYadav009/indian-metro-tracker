import { describe, it, expect } from "vitest";
import {
  operationalLineLayer,
  constructionLineLayer,
  schematicLineLayer,
  plannedLineLayer,
  getSelectedSchematicSegmentLayer,
  stationCircleLayer,
  stationLabelsLayer,
  withVisibility,
  LINE_WIDTH_ZOOM_EXPRESSION,
} from "@/components/map/map-layers";
import { STATION_STYLE } from "@/lib/station-style";
import { MIN_LINE_WIDTH_LOW_ZOOM, NATIONAL_ZOOM_THRESHOLD } from "@/lib/map-config";

describe("MapLibre Layer Specifications", () => {
  it("keeps lines visible at national zoom", () => {
    expect(LINE_WIDTH_ZOOM_EXPRESSION).toContain(NATIONAL_ZOOM_THRESHOLD);
    expect(LINE_WIDTH_ZOOM_EXPRESSION).toContain(MIN_LINE_WIDTH_LOW_ZOOM);
    expect(LINE_WIDTH_ZOOM_EXPRESSION[3]).toBe(3.5);
    expect(LINE_WIDTH_ZOOM_EXPRESSION[4]).toBe(MIN_LINE_WIDTH_LOW_ZOOM);
  });

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
        "all",
        ["==", ["get", "status"], "construction"],
        ["!=", ["get", "geometry_quality"], "schematic"],
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
        "all",
        ["==", ["get", "status"], "planned"],
        ["!=", ["get", "geometry_quality"], "schematic"],
      ]);
      expect(layer.paint?.["line-dasharray"]).toEqual([0.1, 2]);
      expect(layer.paint?.["line-color"]).toEqual(["get", "color"]);
      expect(layer.layout?.["line-cap"]).toBe("round");
    });

    it("renders schematic construction or planned geometry as a dashed approximate alignment", () => {
      const layer = schematicLineLayer as Record<string, any>;
      expect(layer.id).toBe("schematic-lines");
      expect(layer.filter).toEqual(["==", ["get", "geometry_quality"], "schematic"]);
      expect(layer.paint?.["line-dasharray"]).toEqual([4, 2]);
      const selected = getSelectedSchematicSegmentLayer("schematic-segment") as Record<string, any>;
      expect(selected.paint?.["line-dasharray"]).toEqual([4, 2]);
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
      expect(JSON.stringify(layer.paint?.["circle-stroke-width"])).toContain(
        STATION_STYLE.strokeWidth.interchange.toString()
      );
      expect(layer.paint?.["circle-color"]).toBe(STATION_STYLE.fill);
    });

    it("applies MapLibre visibility without changing the source", () => {
      const hidden = withVisibility(stationLabelsLayer, false) as Record<string, any>;
      expect(hidden.layout?.visibility).toBe("none");
      expect(hidden.source).toBe("metro-stations");
    });

    it("configures stationLabelsLayer as symbol layer with zoom threshold", () => {
      const layer = stationLabelsLayer as Record<string, any>;
      expect(layer.id).toBe("station-labels");
      expect(layer.type).toBe("symbol");
      expect(layer.minzoom).toBe(11.5);
    });
  });
});

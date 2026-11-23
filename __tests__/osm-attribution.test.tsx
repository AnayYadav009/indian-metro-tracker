import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import { OsmAttribution } from "@/components/map/osm-attribution";

describe("OsmAttribution Component", () => {
  it("renders attribution with OpenStreetMap and OpenFreeMap links", () => {
    render(<OsmAttribution />);
    const attribution = screen.getByTestId("osm-attribution");
    expect(attribution).toBeInTheDocument();
    expect(attribution).toHaveTextContent("© OpenStreetMap contributors");
    expect(attribution).toHaveTextContent("OpenFreeMap");
  });
});

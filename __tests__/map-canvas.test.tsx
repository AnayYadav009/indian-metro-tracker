import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { MapSkeleton } from "@/components/map/map-skeleton";
import { MapCanvas } from "@/components/map/map-canvas";

// Mock react-map-gl/maplibre for jsdom environment where WebGL is not available
vi.mock("react-map-gl/maplibre", () => {
  return {
    __esModule: true,
    default: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="mock-maplibre-map">{children}</div>
    ),
    NavigationControl: () => <div data-testid="mock-nav-control" />,
    Source: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="mock-map-source">{children}</div>
    ),
    Layer: () => <div data-testid="mock-map-layer" />,
  };
});

describe("Map Canvas Components & Rendering", () => {
  it("renders MapSkeleton correctly", () => {
    render(<MapSkeleton />);
    expect(screen.getByTestId("map-skeleton")).toBeInTheDocument();
    expect(screen.getByText("Loading Map Canvas...")).toBeInTheDocument();
  });

  it("renders MapCanvas with container, layers, and persistent OSM attribution", () => {
    render(<MapCanvas />);
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(screen.getByTestId("mock-maplibre-map")).toBeInTheDocument();
    expect(screen.getByTestId("mock-nav-control")).toBeInTheDocument();
    expect(screen.getAllByTestId("mock-map-source").length).toBe(2);
    // 7 layers: segment glow + 3 line status layers + station highlight + station circles + station labels
    expect(screen.getAllByTestId("mock-map-layer").length).toBe(7);

    const attribution = screen.getByTestId("osm-attribution");
    expect(attribution).toBeInTheDocument();
    expect(attribution).toHaveTextContent("© OpenStreetMap contributors");
    expect(attribution).toHaveTextContent("OpenFreeMap");
  });
});

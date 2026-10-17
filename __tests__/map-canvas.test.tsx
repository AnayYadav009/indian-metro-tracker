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
    GeolocateControl: () => <div data-testid="mock-geolocate-control" />,
    Marker: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="mock-marker">{children}</div>
    ),
    Source: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="mock-map-source">{children}</div>
    ),
    Layer: ({ id }: { id: string }) => (
      <div data-testid={`mock-map-layer-${id}`} data-layer-id={id} />
    ),
  };
});

describe("Map Canvas Components & Rendering", () => {
  it("renders MapSkeleton correctly", () => {
    render(<MapSkeleton />);
    expect(screen.getByTestId("map-skeleton")).toBeInTheDocument();
    expect(screen.getByText("Loading Map Canvas...")).toBeInTheDocument();
  });

  it("renders MapCanvas with container, sources, and line layers", () => {
    render(<MapCanvas />);
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(screen.getByTestId("mock-maplibre-map")).toBeInTheDocument();
    expect(screen.getByTestId("mock-nav-control")).toBeInTheDocument();
    expect(screen.getAllByTestId("mock-map-source").length).toBe(2);
    // 10 layers include separate schematic drawing and selection-glow layers.
    expect(screen.getAllByTestId(/^mock-map-layer-/).length).toBe(10);
    expect(screen.getByTestId("mock-map-layer-schematic-lines")).toBeInTheDocument();
    expect(
      screen.getByTestId("mock-map-layer-selected-schematic-segment-glow")
    ).toBeInTheDocument();
  });
});

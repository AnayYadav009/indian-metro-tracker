import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StationDetail } from "@/components/panels/station-detail";
import type { StationProperties } from "@/types/schema";
import * as dataModule from "@/lib/data";

describe("StationDetail Interchange Provenance Rule", () => {
  const baseStation: StationProperties = {
    station_id: "test-station-interchange",
    name: "Interchange Station",
    city_id: "delhi",
    city: "Delhi",
    line_ids: ["line-a", "line-b"],
    status: "operational",
    phase: "I",
    is_interchange: true,
    opened_on: "2010-01-01",
    expected_completion: null,
    layout: "underground",
    source: "official",
    last_verified: "2026-10-05",
    retrieved_at: "2026-10-01",
  };

  const createMockDataset = (linesConfig: Array<{ id: string; name: string; provenance?: any }>) => {
    return {
      cities: [
        {
          id: "delhi",
          name: "Delhi",
          state: "Delhi",
          country: "India",
          provenance: { status: "unverified" },
        },
      ],
      lines: linesConfig.map((l) => ({
        id: l.id,
        name: l.name,
        city: "Delhi",
        city_id: "delhi",
        color: "#10B981",
        operator: "DMRC",
        provenance: l.provenance,
      })),
      segments: {
        type: "FeatureCollection",
        features: linesConfig.map((l) => ({
          type: "Feature",
          properties: {
            segment_id: `${l.id}-seg-01`,
            line_id: l.id,
            status: "operational",
          },
          geometry: { type: "LineString", coordinates: [] },
        })),
      },
      stations: {
        type: "FeatureCollection",
        features: [],
      },
    };
  };

  it("shows weakest provenance as Unverified and 'Lines' row when mixed (verified + unverified)", () => {
    const mockDataset = createMockDataset([
      {
        id: "line-a",
        name: "Line Alpha",
        provenance: {
          status: "verified",
          source_url: "https://example.com/line-a",
          last_verified: "2026-10-10",
        },
      },
      {
        id: "line-b",
        name: "Line Beta",
        provenance: {
          status: "unverified",
        },
      },
    ]);

    const spy = vi.spyOn(dataModule, "getMetroData").mockReturnValue(mockDataset as any);

    render(<StationDetail station={baseStation} />);

    // Footer shows "Lines" label with weakest status "Unverified"
    const footer = screen.getByTestId("provenance-footer");
    expect(footer).toBeInTheDocument();
    expect(screen.getByText("Lines:")).toBeInTheDocument();
    expect(footer).toHaveTextContent("Unverified");

    const reportBtn = screen.getByTestId("report-issue-button");
    const href = reportBtn.getAttribute("href") || "";
    const parsed = new URL(href);
    const body = parsed.searchParams.get("body") || "";
    expect(body).toContain("- **Line Provenance (Line Alpha):** verified");
    expect(body).toContain("- **Line Provenance (Line Beta):** unverified");

    spy.mockRestore();
  });

  it("shows single 'Lines' row when all connected lines share the same status", () => {
    const mockDataset = createMockDataset([
      {
        id: "line-a",
        name: "Line Alpha",
        provenance: {
          status: "verified",
          source_url: "https://example.com/line-a",
          last_verified: "2026-10-10",
        },
      },
      {
        id: "line-b",
        name: "Line Beta",
        provenance: {
          status: "verified",
          source_url: "https://example.com/line-b",
          last_verified: "2026-10-11",
        },
      },
    ]);

    const spy = vi.spyOn(dataModule, "getMetroData").mockReturnValue(mockDataset as any);

    render(<StationDetail station={baseStation} />);

    const footer = screen.getByTestId("provenance-footer");
    expect(screen.getByText("Lines:")).toBeInTheDocument();
    expect(footer).toHaveTextContent("Verified");

    const reportBtn = screen.getByTestId("report-issue-button");
    const href = reportBtn.getAttribute("href") || "";
    const parsed = new URL(href);
    const body = parsed.searchParams.get("body") || "";
    expect(body).toContain("- **Line Provenance (Line Alpha):** verified");
    expect(body).toContain("- **Line Provenance (Line Beta):** verified");

    spy.mockRestore();
  });

  it("shows 'Line' row for a single-line station", () => {
    const singleLineStation: StationProperties = {
      ...baseStation,
      line_ids: ["line-a"],
      is_interchange: false,
    };

    const mockDataset = createMockDataset([
      {
        id: "line-a",
        name: "Line Alpha",
        provenance: {
          status: "schematic",
          source_url: "https://example.com/line-a",
          last_verified: "2026-10-12",
        },
      },
    ]);

    const spy = vi.spyOn(dataModule, "getMetroData").mockReturnValue(mockDataset as any);

    render(<StationDetail station={singleLineStation} />);

    expect(screen.getByText("Line:")).toBeInTheDocument();
    expect(screen.getByTestId("provenance-footer")).toHaveTextContent("Schematic");

    const reportBtn = screen.getByTestId("report-issue-button");
    const href = reportBtn.getAttribute("href") || "";
    const parsed = new URL(href);
    const body = parsed.searchParams.get("body") || "";
    expect(body).toContain("- **Line Provenance (Line Alpha):** schematic");

    spy.mockRestore();
  });

  it("handles connected line with missing provenance gracefully as unverified", () => {
    const mockDataset = createMockDataset([
      {
        id: "line-a",
        name: "Line Alpha",
        provenance: undefined,
      },
      {
        id: "line-b",
        name: "Line Beta",
        provenance: {
          status: "verified",
          source_url: "https://example.com/line-b",
          last_verified: "2026-10-11",
        },
      },
    ]);

    const spy = vi.spyOn(dataModule, "getMetroData").mockReturnValue(mockDataset as any);

    render(<StationDetail station={baseStation} />);

    const footer = screen.getByTestId("provenance-footer");
    expect(screen.getByText("Lines:")).toBeInTheDocument();
    expect(footer).toHaveTextContent("Unverified");

    const reportBtn = screen.getByTestId("report-issue-button");
    const href = reportBtn.getAttribute("href") || "";
    const parsed = new URL(href);
    const body = parsed.searchParams.get("body") || "";
    expect(body).toContain("- **Line Provenance (Line Alpha):** unverified");
    expect(body).toContain("- **Line Provenance (Line Beta):** verified");

    spy.mockRestore();
  });
});

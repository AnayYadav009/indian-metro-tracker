import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { MetadataPanel } from "@/components/panels/metadata-panel";
import { useMetroStore } from "@/store/use-metro-store";
import type { SegmentProperties, StationProperties } from "@/types/schema";

describe("MetadataPanel Component", () => {
  beforeEach(() => {
    useMetroStore.getState().clearSelectedFeature();
  });

  it("renders nothing when no feature is selected", () => {
    const { container } = render(<MetadataPanel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders segment metadata correctly when a segment is selected", () => {
    const mockSegment: SegmentProperties = {
      segment_id: "del-yellow-seg-01",
      line_id: "del-yellow",
      line_name: "Yellow Line",
      city_id: "delhi",
      city: "Delhi",
      operator: "DMRC",
      status: "operational",
      phase: "I",
      length_km: 12.3,
      gauge: "broad",
      inaugurated_on: "2004-12-20",
      expected_completion: null,
      stations_count: 11,
      color: "#FFD700",
      source: "mock",
      references: ["https://example.com/source-doc"],
      last_verified: "2026-10-05",
    };

    useMetroStore.getState().setSelectedFeature({
      type: "segment",
      data: mockSegment,
    });

    render(<MetadataPanel />);

    // Header & Title
    expect(screen.getByTestId("metadata-panel")).toBeInTheDocument();
    expect(screen.getByText("Metro Segment Details")).toBeInTheDocument();

    // Segment Details
    expect(screen.getByText("Yellow Line")).toBeInTheDocument();
    expect(screen.getByText("del-yellow-seg-01")).toBeInTheDocument();
    expect(screen.getByTestId("status-badge-operational")).toHaveTextContent(
      "Operational"
    );
    expect(screen.getByTestId("phase-badge")).toHaveTextContent("Phase I");

    // Grid properties
    expect(screen.getByText("DMRC")).toBeInTheDocument();
    expect(screen.getByText("12.3 km")).toBeInTheDocument();
    expect(screen.getByText("11 stations")).toBeInTheDocument();
    expect(screen.getByText("broad")).toBeInTheDocument();
    expect(screen.getByText("2004-12-20")).toBeInTheDocument();
    expect(screen.getByText("Verified: 2026-10-05")).toBeInTheDocument();

    // References citation link
    const refLink = screen.getByRole("link", { name: "https://example.com/source-doc" });
    expect(refLink).toBeInTheDocument();
    expect(refLink).toHaveAttribute("href", "https://example.com/source-doc");

    // Report an issue button
    const reportButton = screen.getByTestId("report-issue-button");
    expect(reportButton).toBeInTheDocument();
    expect(reportButton).toHaveAttribute("target", "_blank");
    expect(reportButton).toHaveAttribute("rel", "noopener noreferrer");
    expect(reportButton.getAttribute("href")).toContain(
      "https://github.com/AnayYadav009/indian-metro-tracker/issues/new"
    );
    expect(reportButton.getAttribute("href")).toContain("template=data-correction.yml");
    expect(reportButton.getAttribute("href")).toContain("del-yellow-seg-01");
  });

  it("renders under-construction segment with expected completion date", () => {
    const mockSegment: SegmentProperties = {
      segment_id: "blr-pink-seg-01",
      line_id: "blr-pink",
      line_name: "Pink Line",
      city_id: "bengaluru",
      city: "Bengaluru",
      operator: "BMRCL",
      status: "construction",
      phase: "2",
      length_km: 13.8,
      gauge: "standard",
      inaugurated_on: null,
      expected_completion: "2026-06",
      stations_count: 12,
      color: "#EC4899",
      source: "mock",
      references: [],
      last_verified: "2026-10-05",
    };

    useMetroStore.getState().setSelectedFeature({
      type: "segment",
      data: mockSegment,
    });

    render(<MetadataPanel />);

    expect(screen.getByTestId("status-badge-construction")).toHaveTextContent(
      "Under Construction"
    );
    expect(screen.getByText("2026-06")).toBeInTheDocument();
    expect(screen.getByText("Expected Completion")).toBeInTheDocument();
  });

  it("renders station metadata correctly when a station is selected", () => {
    const mockStation: StationProperties = {
      station_id: "del-rajiv-chowk",
      name: "Rajiv Chowk",
      city_id: "delhi",
      city: "Delhi",
      line_ids: ["del-yellow", "del-blue"],
      status: "operational",
      phase: "I",
      is_interchange: true,
      opened_on: "2005-01-01",
      expected_completion: null,
      layout: "underground",
      source: "mock",
      last_verified: "2026-10-05",
    };

    useMetroStore.getState().setSelectedFeature({
      type: "station",
      data: mockStation,
    });

    render(<MetadataPanel />);

    // Header & Title
    expect(screen.getByTestId("metadata-panel")).toBeInTheDocument();
    expect(screen.getByText("Metro Station Details")).toBeInTheDocument();

    // Station Name & Badges
    expect(screen.getByText("Rajiv Chowk")).toBeInTheDocument();
    expect(screen.getByText("del-rajiv-chowk")).toBeInTheDocument();
    expect(screen.getByTestId("interchange-badge")).toBeInTheDocument();
    expect(screen.getByTestId("status-badge-operational")).toBeInTheDocument();
    expect(screen.getByTestId("phase-badge")).toHaveTextContent("Phase I");
    expect(screen.getByTestId("layout-badge")).toHaveTextContent("Underground");

    // Connected Lines
    expect(screen.getByTestId("connected-line-del-yellow")).toHaveTextContent(
      "Yellow Line"
    );
    expect(screen.getByTestId("connected-line-del-blue")).toHaveTextContent(
      "Blue Line"
    );

    // Dates
    expect(screen.getByText("2005-01-01")).toBeInTheDocument();

    // Report an issue button
    const reportButton = screen.getByTestId("report-issue-button");
    expect(reportButton).toBeInTheDocument();
    expect(reportButton.getAttribute("href")).toContain(
      "https://github.com/AnayYadav009/indian-metro-tracker/issues/new"
    );
    expect(reportButton.getAttribute("href")).toContain("template=data-correction.yml");
    expect(reportButton.getAttribute("href")).toContain("del-rajiv-chowk");
  });

  it("clears selectedFeature when clicking the close button", () => {
    const mockStation: StationProperties = {
      station_id: "del-rajiv-chowk",
      name: "Rajiv Chowk",
      city_id: "delhi",
      city: "Delhi",
      line_ids: ["del-yellow"],
      status: "operational",
      phase: "I",
      is_interchange: false,
      opened_on: "2005-01-01",
      expected_completion: null,
      layout: "underground",
      source: "mock",
      last_verified: "2026-10-05",
    };

    useMetroStore.getState().setSelectedFeature({
      type: "station",
      data: mockStation,
    });

    render(<MetadataPanel />);
    expect(screen.getByTestId("metadata-panel")).toBeInTheDocument();

    const closeButton = screen.getByTestId("close-metadata-panel");
    fireEvent.click(closeButton);

    expect(useMetroStore.getState().selectedFeature).toBeNull();
  });
});

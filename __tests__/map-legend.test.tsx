import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { MapLegend } from "@/components/legend/map-legend";
import { useMetroStore } from "@/store/use-metro-store";

describe("MapLegend Component", () => {
  beforeEach(() => {
    useMetroStore.getState().resetFilters();
  });

  it("renders the map legend with all three line status styles", () => {
    render(<MapLegend />);

    expect(screen.getByTestId("map-legend")).toBeInTheDocument();
    expect(screen.getByText("Line Status Styles")).toBeInTheDocument();

    // Operational (solid)
    const op = screen.getByTestId("legend-status-operational");
    expect(op).toHaveTextContent("Operational");
    expect(op).toHaveTextContent("Solid");

    // Construction (dashed)
    const constr = screen.getByTestId("legend-status-construction");
    expect(constr).toHaveTextContent("Under Construction");
    expect(constr).toHaveTextContent("Dashed");

    // Planned (dotted)
    const planned = screen.getByTestId("legend-status-planned");
    expect(planned).toHaveTextContent("Planned / Proposed");
    expect(planned).toHaveTextContent("Dotted");
  });

  it("renders station marker symbology (interchange and standard)", () => {
    render(<MapLegend />);

    expect(screen.getByText("Station Markers")).toBeInTheDocument();
    expect(screen.getByTestId("legend-station-interchange")).toHaveTextContent(
      "Interchange"
    );
    expect(screen.getByTestId("legend-station-standard")).toHaveTextContent(
      "Standard"
    );
  });

  it("derives station swatch colors and widths from STATION_STYLE", () => {
    render(<MapLegend />);
    const standard = screen.getByTestId("legend-station-standard").firstElementChild;
    const interchange = screen.getByTestId("legend-station-interchange").firstElementChild;

    expect(standard).toHaveStyle({
      backgroundColor: "#ffffff",
      border: "1.5px solid #0f172a",
    });
    expect(interchange).toHaveStyle({
      backgroundColor: "#ffffff",
      border: "3px solid #0f172a",
    });
  });

  it("collapses and re-expands when the toggle button is clicked", () => {
    render(<MapLegend />);

    expect(screen.getByTestId("legend-content")).toBeInTheDocument();

    const toggleBtn = screen.getByTestId("toggle-legend-btn");
    fireEvent.click(toggleBtn);

    // Collapsed: content hidden
    expect(screen.queryByTestId("legend-content")).toBeNull();

    // Re-expand
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId("legend-content")).toBeInTheDocument();
  });

  it("shows hint when no city is selected", () => {
    render(<MapLegend />);
    expect(
      screen.getByText("Select a city to view its line color palette.")
    ).toBeInTheDocument();
  });

  it("updates active lines list when a city is selected in the store by city_id", () => {
    useMetroStore.getState().setSelectedCity("delhi");
    render(<MapLegend />);

    expect(screen.getByText("Delhi Lines")).toBeInTheDocument();
    expect(screen.getByTestId("legend-line-del-yellow")).toHaveTextContent(
      "Yellow Line"
    );
  });
});

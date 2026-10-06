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
      "Standard Station"
    );
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

  it("updates active lines list when a city is selected in the store", () => {
    useMetroStore.getState().setSelectedCity("delhi");
    render(<MapLegend />);

    expect(screen.getByText("Delhi Lines")).toBeInTheDocument();
    expect(screen.getByTestId("legend-line-del-yellow")).toHaveTextContent(
      "Yellow Line"
    );
  });
});

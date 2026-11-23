import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterPanel } from "@/components/filters/filter-panel";
import { useMetroStore } from "@/store/use-metro-store";

describe("FilterPanel Component", () => {
  beforeEach(() => {
    useMetroStore.getState().resetFilters();
  });

  it("renders filter panel with header and section controls", () => {
    render(<FilterPanel />);
    expect(screen.getByTestId("filter-panel")).toBeInTheDocument();
    expect(
      screen.getByText("Filters & Network Controls")
    ).toBeInTheDocument();
  });

  it("renders city selector buttons", () => {
    render(<FilterPanel />);
    expect(screen.getByTestId("city-select-all")).toBeInTheDocument();
    expect(screen.getByTestId("city-select-delhi")).toBeInTheDocument();
    expect(screen.getByTestId("city-select-bengaluru")).toBeInTheDocument();
    expect(screen.getByTestId("city-select-mumbai")).toBeInTheDocument();
  });

  it("updates selected city when a city button is clicked", () => {
    render(<FilterPanel />);
    const delhiBtn = screen.getByTestId("city-select-delhi");
    fireEvent.click(delhiBtn);
    expect(useMetroStore.getState().selectedCityId).toBe("delhi");
  });

  it("renders status filter toggles with pattern labels", () => {
    render(<FilterPanel />);
    expect(screen.getByTestId("status-toggle-operational")).toBeInTheDocument();
    expect(screen.getByTestId("status-toggle-construction")).toBeInTheDocument();
    expect(screen.getByTestId("status-toggle-planned")).toBeInTheDocument();

    expect(screen.getByText("Solid")).toBeInTheDocument();
    expect(screen.getByText("Dashed")).toBeInTheDocument();
    expect(screen.getByText("Dotted")).toBeInTheDocument();
  });

  it("toggles status when clicked", () => {
    render(<FilterPanel />);
    const opBtn = screen.getByTestId("status-toggle-operational");
    fireEvent.click(opBtn);
    expect(useMetroStore.getState().selectedStatuses).not.toContain(
      "operational"
    );
  });

  it("updates search input and resets on reset button click", () => {
    render(<FilterPanel />);
    const searchInput = screen.getByTestId("filter-search-input");
    fireEvent.change(searchInput, { target: { value: "Yellow" } });
    expect(useMetroStore.getState().searchQuery).toBe("Yellow");

    // Reset button should now be visible
    const resetBtn = screen.getByTestId("reset-filters-btn");
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);

    expect(useMetroStore.getState().searchQuery).toBe("");
  });

  it("collapses and expands panel when toggle button is clicked", () => {
    render(<FilterPanel />);
    const collapseBtn = screen.getByTestId("collapse-filter-btn");
    expect(screen.getByTestId("filter-search-input")).toBeInTheDocument();

    fireEvent.click(collapseBtn);
    expect(screen.queryByTestId("filter-search-input")).not.toBeInTheDocument();

    fireEvent.click(collapseBtn);
    expect(screen.getByTestId("filter-search-input")).toBeInTheDocument();
  });

  it("shows muted hint when no city is selected and shows city phase pills when city is chosen", () => {
    render(<FilterPanel />);
    expect(screen.getByTestId("phase-filter-empty-hint")).toBeInTheDocument();
    expect(
      screen.getByText("Select a city to filter by phase")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("phase-pill-I")).not.toBeInTheDocument();

    // Select Delhi
    const delhiBtn = screen.getByTestId("city-select-delhi");
    fireEvent.click(delhiBtn);

    expect(screen.queryByTestId("phase-filter-empty-hint")).not.toBeInTheDocument();
    expect(screen.getByTestId("phase-pill-I")).toBeInTheDocument();
    expect(screen.getByTestId("phase-pill-I")).toHaveTextContent("Phase I");
    expect(screen.getByTestId("phase-pill-IV")).toHaveTextContent("Phase IV");
  });
});

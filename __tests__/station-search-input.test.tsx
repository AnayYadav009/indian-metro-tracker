import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StationSearchInput } from "@/components/search/station-search-input";
import { useMetroStore } from "@/store/use-metro-store";

describe("StationSearchInput Component (M23 Shell Step 5)", () => {
  it("renders the combobox input with accessible placeholder and attributes", () => {
    render(<StationSearchInput placeholder="Search any station..." />);
    const input = screen.getByRole("combobox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "Search any station...");
  });

  it("filters stations as user types and selects a station on click", () => {
    const handleSelect = vi.fn();
    render(<StationSearchInput onSelectStation={handleSelect} />);

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Kashmere" } });

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]).toHaveTextContent("Kashmere Gate");

    fireEvent.mouseDown(options[0]);
    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(useMetroStore.getState().selectedFeature?.type).toBe("station");
    expect((useMetroStore.getState().selectedFeature?.data as any)?.name).toBe("Kashmere Gate");
  });
});

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { EmptyFilterState } from "@/components/map/empty-state";
import { useMetroStore } from "@/store/use-metro-store";

describe("EmptyFilterState Component", () => {
  beforeEach(() => {
    useMetroStore.getState().resetFilters();
  });

  it("renders nothing when filters match existing metro lines", () => {
    const { container } = render(<EmptyFilterState />);
    expect(container.firstChild).toBeNull();
  });

  it("renders empty state notice when search matches nothing and allows reset", () => {
    // Search for a non-existent metro line
    useMetroStore.getState().setSearchQuery("NonExistentMetroLine12345");

    render(<EmptyFilterState />);

    expect(screen.getByTestId("empty-filter-state")).toBeInTheDocument();
    expect(
      screen.getByText("No metro lines match your filter")
    ).toBeInTheDocument();

    const resetBtn = screen.getByTestId("empty-reset-btn");
    fireEvent.click(resetBtn);

    expect(useMetroStore.getState().searchQuery).toBe("");
  });
});

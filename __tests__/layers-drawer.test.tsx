import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { LayersDrawer } from "@/components/layers/layers-drawer";

describe("LayersDrawer Component (M23 Shell Step 4)", () => {
  it("renders nothing visible when open is false", () => {
    const { container } = render(<LayersDrawer open={false} onClose={() => {}} />);
    const drawer = container.querySelector('[data-testid="layers-drawer"]');
    expect(drawer).toHaveAttribute("hidden");
    expect(drawer).toHaveStyle({ display: "none" });
  });

  it("renders title, timeline, filter panel, legend, and close button when open", () => {
    const handleClose = vi.fn();
    render(<LayersDrawer open={true} onClose={handleClose} />);

    expect(screen.getByRole("heading", { name: "Layers & Settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Timeline" })).toBeInTheDocument();
    expect(screen.getByTestId("timeline-slider-container")).toBeInTheDocument();
    expect(screen.getByTestId("filter-panel")).toBeInTheDocument();
    expect(screen.getByTestId("map-legend")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /close layers and settings/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

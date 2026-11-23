import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/layout/app-header";
import HomePage from "@/app/page";
import { BASEMAP_CONFIG } from "@/lib/map-config";

vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="mock-map-canvas">Map Canvas</div>,
}));

describe("Home page header", () => {
  it("renders the application header with title and branding", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", {
        name: /Indian Metro Network Tracker/i,
        level: 1,
      })
    ).toBeInTheDocument();
    expect(screen.getByText("IM")).toBeInTheDocument();
  });

  it("renders basemap and dataset metadata indicators", () => {
    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: "Layers and settings" }));
    expect(screen.getByText(`Basemap: ${BASEMAP_CONFIG.name}`)).toBeInTheDocument();
    expect(screen.getByTestId("data-last-updated")).toBeInTheDocument();
  });

  it("opens the secondary layers drawer from the map header", () => {
    render(<HomePage />);
    fireEvent.click(screen.getByTestId("layers-drawer-trigger"));
    expect(screen.getByTestId("layers-drawer")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-slider-container")).toBeInTheDocument();
  });
});

describe("AppHeader", () => {
  it("renders the compact shared frame with mobile safe-area spacing", () => {
    render(
      <AppHeader variant="compact" aria-label="Network header">
        <span>Metro network</span>
      </AppHeader>
    );

    const header = screen.getByRole("banner", { name: "Network header" });
    expect(header).toHaveTextContent("Metro network");
    expect(header).toHaveClass("relative", "border-b", "md:h-14");
    expect(header.className).toContain("safe-area-inset-top");
  });

  it("supports a sticky content-page header", () => {
    render(
      <AppHeader variant="page">
        <span>City network</span>
      </AppHeader>
    );

    const header = screen.getByRole("banner");
    expect(header).toHaveTextContent("City network");
    expect(header).toHaveClass("sticky", "top-0");
    expect(header.className).toContain("safe-area-inset-top");
  });
});

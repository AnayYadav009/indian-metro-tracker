import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HomePage from "@/app/page";
import { BASEMAP_CONFIG } from "@/lib/map-config";

// Mock MapCanvas dynamic import for jsdom environment
vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="mock-map-canvas">Map Canvas</div>,
}));

describe("App Header", () => {
  it("renders the application header with title and branding", () => {
    render(<HomePage />);
    const heading = screen.getByRole("heading", {
      name: /Indian Metro Network Tracker/i,
      level: 1,
    });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText("IM")).toBeInTheDocument();
  });

  it("renders basemap and dataset metadata indicators", () => {
    render(<HomePage />);
    expect(screen.getByText(BASEMAP_CONFIG.name)).toBeInTheDocument();
    expect(screen.getByTestId("data-last-updated")).toBeInTheDocument();
  });
});

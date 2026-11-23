import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import { MockBanner } from "@/components/ui/mock-banner";
import { DATA_SOURCE } from "@/lib/data";

describe("MockBanner Component", () => {
  it("renders the illustrative mock data notice when DATA_SOURCE is mock", () => {
    render(<MockBanner />);

    if (DATA_SOURCE === "mock") {
      const banner = screen.getByTestId("mock-data-banner");
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(
        "Data is illustrative/mock — real data pipeline coming in Milestone 7"
      );
    }
  });

  it("dismisses the mock banner when the close button is clicked", () => {
    if (DATA_SOURCE !== "mock") return;

    render(<MockBanner />);
    const banner = screen.getByTestId("mock-data-banner");
    expect(banner).toBeInTheDocument();

    const dismissBtn = screen.getByTestId("dismiss-mock-banner");
    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId("mock-data-banner")).toBeNull();
  });
});

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProvenanceFooter } from "@/components/panels/provenance-footer";
import type { Provenance } from "@/types/schema";

describe("ProvenanceFooter Component", () => {
  it("renders unverified status with fallback texts and disclaimer", () => {
    const unverifiedProv: Provenance = {
      status: "unverified",
    };

    render(
      <ProvenanceFooter
        items={[{ label: "City", provenance: unverifiedProv }]}
        testId="test-footer"
      />
    );

    expect(screen.getByTestId("test-footer")).toBeInTheDocument();
    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(screen.getByText("No official source link")).toBeInTheDocument();
    expect(screen.getByText("Not verified")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Unofficial data. Estimates only. Check with the operator before you travel."
      )
    ).toBeInTheDocument();
  });

  it("renders verified status with source link and verified date", () => {
    const verifiedProv: Provenance = {
      status: "verified",
      source_url: "https://example-operator.com/lines",
      last_verified: "2026-10-20",
    };

    render(
      <ProvenanceFooter
        items={[{ label: "Line", provenance: verifiedProv }]}
      />
    );

    expect(screen.getByText("Verified")).toBeInTheDocument();
    const sourceLink = screen.getByRole("link", { name: /Source/i });
    expect(sourceLink).toHaveAttribute("href", "https://example-operator.com/lines");
    expect(sourceLink).toHaveAttribute("target", "_blank");
    expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("Verified 2026-10-20")).toBeInTheDocument();
  });

  it("renders schematic status badge properly", () => {
    const schematicProv: Provenance = {
      status: "schematic",
      source_url: "https://example.com/schematic",
      last_verified: "2026-10-15",
    };

    render(
      <ProvenanceFooter
        items={[{ label: "Network", provenance: schematicProv }]}
      />
    );

    expect(screen.getByText("Schematic")).toBeInTheDocument();
  });

  it("renders multiple items (e.g. City and Line) and only a single disclaimer notice", () => {
    const cityProv: Provenance = { status: "unverified" };
    const lineProv: Provenance = {
      status: "verified",
      source_url: "https://dmrc.com",
      last_verified: "2026-10-22",
    };

    const { container } = render(
      <ProvenanceFooter
        items={[
          { label: "City", provenance: cityProv },
          { label: "Line", provenance: lineProv },
        ]}
      />
    );

    expect(screen.getByText(/City/i)).toBeInTheDocument();
    expect(screen.getByText(/Line/i)).toBeInTheDocument();
    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();

    const notices = container.querySelectorAll("[data-testid='provenance-disclaimer-notice']");
    expect(notices).toHaveLength(1);
  });
});

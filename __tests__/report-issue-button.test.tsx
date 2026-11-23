import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportIssueButton } from "@/components/panels/report-issue-button";
import type { IssueTarget } from "@/lib/issue-url";

describe("ReportIssueButton Component", () => {
  const mockStationTarget: IssueTarget = {
    type: "station",
    data: {
      station_id: "test-stn-1",
      name: "Test Station",
      city_id: "delhi",
      city: "Delhi",
      line_ids: ["del-red"],
      status: "operational",
      phase: "Phase 1",
      is_interchange: false,
      opened_on: "2020-01-01",
      expected_completion: null,
      layout: "elevated",
      source: "osm",
      last_verified: null,
      retrieved_at: "2026-10-08",
    },
    cityProvenance: { status: "unverified", source_url: null, last_verified: null },
    lineProvenance: { status: "unverified", source_url: null, last_verified: null },
  };

  const mockRouteTarget: IssueTarget = {
    type: "route",
    data: {
      cityId: "delhi",
      cityName: "Delhi",
      fromStation: { id: "test-stn-1", name: "Start Stn" },
      toStation: { id: "test-stn-2", name: "End Stn" },
      stationCount: 2,
      estimatedTime: "5 min",
      orderedStationIds: ["test-stn-1", "test-stn-2"],
    },
  };

  const mockCityTarget: IssueTarget = {
    type: "city",
    data: {
      cityId: "delhi",
      cityName: "Delhi",
      provenance: { status: "unverified", source_url: null, last_verified: null },
    },
  };

  it("renders station report issue button with target blank, rel noopener noreferrer, and accessible aria-label", () => {
    render(<ReportIssueButton target={mockStationTarget} />);

    const button = screen.getByTestId("report-issue-button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Report an issue");
    expect(button).toHaveTextContent("GitHub");
    expect(button).toHaveAttribute("target", "_blank");
    expect(button).toHaveAttribute("rel", "noopener noreferrer");
    expect(button).toHaveAttribute(
      "aria-label",
      "Report an issue on GitHub (opens in a new tab)"
    );

    const href = button.getAttribute("href");
    expect(href).not.toBeNull();
    const parsed = new URL(href!);
    expect(parsed.origin).toBe("https://github.com");
    expect(parsed.pathname).toBe("/AnayYadav009/indian-metro-tracker/issues/new");
    expect(parsed.searchParams.get("template")).toBe("data-correction.yml");
    expect(parsed.searchParams.get("labels")).toBe("data-correction");
    expect(parsed.searchParams.get("title")).toBe("[Data Correction]: Station Test Station (Delhi)");
    expect(parsed.searchParams.get("body")).toContain("Test Station");
    expect(parsed.searchParams.get("body")).toContain("### Network Provenance");
  });

  it("renders route report issue button with prefilled route parameters", () => {
    render(<ReportIssueButton target={mockRouteTarget} />);

    const button = screen.getByTestId("report-issue-button");
    expect(button).toBeInTheDocument();

    const href = button.getAttribute("href");
    expect(href).not.toBeNull();
    const parsed = new URL(href!);
    expect(parsed.searchParams.get("title")).toBe("[Data Correction]: Route Start Stn to End Stn (Delhi)");
    expect(parsed.searchParams.get("body")).toContain("### Route Diagnostics");
    expect(parsed.searchParams.get("body")).toContain("**Total Stations:** 2");
    expect(parsed.searchParams.get("body")).toContain("**Estimated Travel Time:** 5 min");
  });

  it("renders city report issue button with prefilled city parameters", () => {
    render(<ReportIssueButton target={mockCityTarget} />);

    const button = screen.getByTestId("report-issue-button");
    expect(button).toBeInTheDocument();

    const href = button.getAttribute("href");
    expect(href).not.toBeNull();
    const parsed = new URL(href!);
    expect(parsed.searchParams.get("title")).toBe("[Data Correction]: City Delhi");
    expect(parsed.searchParams.get("body")).toContain("### City Network Diagnostics");
    expect(parsed.searchParams.get("body")).toContain("**Provenance Status:** unverified");
  });
});

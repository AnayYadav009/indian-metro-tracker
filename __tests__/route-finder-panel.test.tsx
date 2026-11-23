import { describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RouteFinderPanel } from "@/components/routing/route-finder-panel";
import { useMetroStore } from "@/store/use-metro-store";
import { buildTransitGraph, findRoute } from "@/lib/routing/graph";

describe("RouteFinderPanel v2 (M24)", () => {
  beforeEach(() => {
    // Reset browser URL query params
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/");
    }

    // Reset store state completely
    useMetroStore.setState({
      isRoutePanelOpen: true,
      selectedCityId: null,
      routeOriginId: null,
      routeDestinationId: null,
      activeRoute: null,
      routeFocusTarget: null,
      selectedFeature: null,
    });
  });

  afterEach(() => {
    cleanup();
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/");
    }
  });

  it("renders Route Finder panel when open", () => {
    render(<RouteFinderPanel />);
    expect(screen.getByTestId("route-finder-panel")).toBeInTheDocument();
    expect(screen.getByTestId("route-city-select")).toBeInTheDocument();
  });

  it("Delhi route with verified fare displays fare summary card and details", () => {
    const graph = buildTransitGraph({ cityId: "delhi" });
    const route = findRoute(graph, "del-kashmere-gate", "del-rajiv-chowk");
    expect(route).not.toBeNull();

    useMetroStore.setState({
      selectedCityId: "delhi",
      routeOriginId: "del-kashmere-gate",
      routeDestinationId: "del-rajiv-chowk",
      activeRoute: route,
    });

    render(<RouteFinderPanel />);

    // Check fare summary card exists
    const fareCard = screen.getByTestId("route-fare-summary-card");
    expect(fareCard).toBeInTheDocument();
    expect(fareCard).toHaveTextContent("Est. Fare");
    // Band 1: [2, 5 km) -> ₹21
    expect(fareCard).toHaveTextContent("₹21");

    // Check fare details container
    const fareDetails = screen.getByTestId("route-fare-details");
    expect(fareDetails).toBeInTheDocument();
    expect(fareDetails).toHaveTextContent("Estimated Single Journey Fare: ₹21");
    expect(fareDetails).toHaveTextContent("Mon–Sat rate");

    // Check unverified timings caveat
    const timingNotice = screen.getByTestId("route-timings-unverified-notice");
    expect(timingNotice).toBeInTheDocument();
    expect(timingNotice).toHaveTextContent("First/last train times and service frequencies are not published");
  });

  it("Hyderabad route with verified fare displays fare summary card", () => {
    const graph = buildTransitGraph({ cityId: "hyderabad" });
    const route = findRoute(graph, "hyderabad-raidurg", "hyderabad-hitec-city");
    expect(route).not.toBeNull();

    useMetroStore.setState({
      selectedCityId: "hyderabad",
      routeOriginId: "hyderabad-raidurg",
      routeDestinationId: "hyderabad-hitec-city",
      activeRoute: route,
    });

    render(<RouteFinderPanel />);

    const fareCard = screen.getByTestId("route-fare-summary-card");
    expect(fareCard).toBeInTheDocument();
    expect(fareCard).toHaveTextContent("Est. Fare");
    expect(fareCard).toHaveTextContent("₹11");
  });

  it("Kochi route without verified fares omits fare card entirely", () => {
    const graph = buildTransitGraph({ cityId: "kochi" });
    const route = findRoute(graph, "kochi-aluva", "kochi-edappally");
    expect(route).not.toBeNull();

    useMetroStore.setState({
      selectedCityId: "kochi",
      routeOriginId: "kochi-aluva",
      routeDestinationId: "kochi-edappally",
      activeRoute: route,
    });

    render(<RouteFinderPanel />);

    // Fare summary card and fare details must be completely absent
    expect(screen.queryByTestId("route-fare-summary-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("route-fare-details")).not.toBeInTheDocument();

    // Standard stats (time, stops, transfers) remain present
    expect(screen.getByText("Est. Time")).toBeInTheDocument();
    expect(screen.getByText("Stops")).toBeInTheDocument();
    expect(screen.getByText("Transfers")).toBeInTheDocument();
  });

  it("renders clear interchange instructions and intermediate stops toggle", () => {
    const graph = buildTransitGraph({ cityId: "delhi" });
    const route = findRoute(graph, "del-rithala", "del-raja-nahar-singh");
    expect(route).not.toBeNull();
    expect(route?.totalTransfers).toBe(1);

    useMetroStore.setState({
      selectedCityId: "delhi",
      routeOriginId: "del-rithala",
      routeDestinationId: "del-raja-nahar-singh",
      activeRoute: route,
    });

    render(<RouteFinderPanel />);

    // Check transfer notice
    const transferNotice = screen.getByTestId("transfer-notice-0");
    expect(transferNotice).toBeInTheDocument();
    expect(transferNotice).toHaveTextContent("Interchange at Kashmere Gate");
    expect(transferNotice).toHaveTextContent("Change from Red Line to Violet Line");
    expect(transferNotice).toHaveTextContent("allow approx");

    // Check intermediate stops toggle
    const toggleBtn = screen.getByTestId("toggle-stops-btn-0");
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent("Show");

    // Expand intermediate stops
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent("Hide");
    const stopsList = screen.getByTestId("intermediate-stops-list-0");
    expect(stopsList).toBeInTheDocument();
    expect(stopsList.children.length).toBeGreaterThan(0);
  });
});

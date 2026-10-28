import { describe, expect, it } from "vitest";
import { searchAndOrderCities } from "@/lib/city-order";

const cities = [
  { id: "pune", name: "Pune", operator: "PMRDA" },
  { id: "hyderabad", name: "Hyderabad", operator: "LTMRHL" },
  { id: "agra", name: "Agra", operator: "UPMRC" },
  { id: "mumbai", name: "Mumbai", operator: "MMRDA" },
  { id: "delhi", name: "Delhi", operator: "DMRC" },
  { id: "bengaluru", name: "Bengaluru", operator: "BMRCL" },
  { id: "chennai", name: "Chennai", operator: "CMRL" },
  { id: "kolkata", name: "Kolkata", operator: "KMRC" },
];

describe("searchAndOrderCities", () => {
  it("orders Tier 1 cities first, then Tier 2 alphabetically", () => {
    expect(searchAndOrderCities(cities, "", null).map(({ id }) => id)).toEqual([
      "delhi",
      "mumbai",
      "bengaluru",
      "chennai",
      "kolkata",
      "hyderabad",
      "agra",
      "pune",
    ]);
  });

  it("ranks the selected city first and filters by name or operator", () => {
    expect(searchAndOrderCities(cities, "metro", "pune").map(({ id }) => id)).toEqual([]);
    expect(searchAndOrderCities(cities, "m", "pune").map(({ id }) => id)).toEqual([
      "pune",
      "delhi",
      "mumbai",
      "bengaluru",
      "chennai",
      "kolkata",
      "hyderabad",
      "agra",
    ]);
    expect(searchAndOrderCities(cities, "agra", null).map(({ id }) => id)).toEqual([
      "agra",
    ]);
  });
});

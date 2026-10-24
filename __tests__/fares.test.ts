import { describe, it, expect } from "vitest";
import {
  FareRuleSchema,
  ServiceHoursSchema,
} from "../types/schema";
import {
  validateFareRules,
  validateServiceHours,
  validateMetroDataset,
} from "../lib/data-validator";
import {
  estimateFare,
  estimateRouteFare,
  getFareRuleForLine,
  getServiceHours,
  hasSourcedFares,
} from "../lib/fares";
import type { City, Line, FareRule, ServiceHours, StationFeature } from "../types/metro";
import { isOfficialSourceHost } from "../lib/official-source-hosts";
import realCities from "../data/cities.json";
import realLines from "../data/lines.json";
import realFares from "../data/fares.json";
import realTimings from "../data/timings.json";

describe("M21a Fare and Timing Data Model & Validator", () => {
  const clock = "2026-10-24";

  const mockCity: City = {
    id: "mock-city-delhi",
    name: "Mock Delhi",
    bbox: [76.84, 28.4, 77.35, 28.88],
    operator: "Mock DMRC",
    phases: ["I"],
    provenance: { status: "unverified" },
  };

  const mockLine1: Line = {
    id: "mock-line-red",
    name: "Mock Red Line",
    city_id: "mock-city-delhi",
    city: "Mock Delhi",
    color: "#FF0000",
    operator: "Mock DMRC",
    source: "osm",
    provenance: { status: "unverified" },
  };

  const mockLine2: Line = {
    id: "mock-line-blue",
    name: "Mock Blue Line",
    city_id: "mock-city-delhi",
    city: "Mock Delhi",
    color: "#0000FF",
    operator: "Mock DMRC",
    source: "osm",
    provenance: { status: "unverified" },
  };

  const mockStation1: StationFeature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [77.2, 28.6] },
    properties: {
      station_id: "mock-station-rithala",
      name: "Mock Rithala",
      city_id: "mock-city-delhi",
      city: "Mock Delhi",
      line_ids: ["mock-line-red"],
      status: "operational",
      phase: "I",
      is_interchange: false,
      opened_on: "2020-01-01",
      expected_completion: null,
      layout: "elevated",
      source: "osm",
      last_verified: null,
    },
  };

  const mockStation2: StationFeature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [77.3, 28.7] },
    properties: {
      station_id: "mock-station-shaheed-sthal",
      name: "Mock Shaheed Sthal",
      city_id: "mock-city-delhi",
      city: "Mock Delhi",
      line_ids: ["mock-line-red"],
      status: "operational",
      phase: "I",
      is_interchange: false,
      opened_on: "2020-01-01",
      expected_completion: null,
      layout: "elevated",
      source: "osm",
      last_verified: null,
    },
  };

  const validVerifiedFareRule: FareRule = {
    id: "mock-fare-delhi-standard",
    city_id: "mock-city-delhi",
    operator: "Mock DMRC",
    applies_to_line_ids: ["mock-line-red"],
    ticket_type: "single_journey",
    currency: "INR",
    distance_basis: "computed_route_km",
    day_scope: "mon_sat",
    bands: [
      { min_km: 0, max_km: 2, fare_inr: 10 },
      { min_km: 2, max_km: 5, fare_inr: 20 },
      { min_km: 5, max_km: 12, fare_inr: 30 },
      { min_km: 12, max_km: 21, fare_inr: 40 },
      { min_km: 21, max_km: 32, fare_inr: 50 },
      { min_km: 32, max_km: null, fare_inr: 60 },
    ],
    effective_from: "2026-01-01",
    provenance: {
      status: "verified",
      source_url: "https://delhimetrorail.com/mock-fare-table",
      last_verified: "2026-10-20",
      note: "Mock verified single journey fare chart",
    },
  };

  function createMockFareRule(overrides: Partial<FareRule> = {}): FareRule {
    return {
      ...validVerifiedFareRule,
      ...overrides,
    };
  }

  const validServiceHours: ServiceHours = {
    id: "mock-timing-red-rithala-weekday",
    line_id: "mock-line-red",
    station_id: "mock-station-rithala",
    towards_station_id: "mock-station-shaheed-sthal",
    day_type: "weekday",
    first_train: "05:30",
    last_train: "23:00",
    last_train_crosses_midnight: false,
    provenance: {
      status: "verified",
      source_url: "https://delhimetrorail.com/mock-train-timings",
      last_verified: "2026-10-20",
    },
  };

  describe("Validator: Band Rules", () => {
    it("1. Rejects first min_km not equal to 0", () => {
      const rule = {
        ...validVerifiedFareRule,
        bands: [
          { min_km: 1, max_km: 5, fare_inr: 10 },
          { min_km: 5, max_km: null, fare_inr: 20 },
        ],
      };
      const res = FareRuleSchema.safeParse(rule);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("first band min_km must be 0"))).toBe(true);
      }
    });

    it("2. Rejects non-contiguous bands (min_km != previous max_km)", () => {
      const rule = {
        ...validVerifiedFareRule,
        bands: [
          { min_km: 0, max_km: 2, fare_inr: 10 },
          { min_km: 3, max_km: null, fare_inr: 20 },
        ],
      };
      const res = FareRuleSchema.safeParse(rule);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("must equal previous band max_km"))).toBe(true);
      }
    });

    it("3. Rejects overlapping bands", () => {
      const rule = {
        ...validVerifiedFareRule,
        bands: [
          { min_km: 0, max_km: 5, fare_inr: 10 },
          { min_km: 4, max_km: null, fare_inr: 20 },
        ],
      };
      const res = FareRuleSchema.safeParse(rule);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("must equal previous band max_km"))).toBe(true);
      }
    });

    it("4. Rejects max_km <= min_km within a band", () => {
      const rule = {
        ...validVerifiedFareRule,
        bands: [
          { min_km: 0, max_km: 0, fare_inr: 10 },
          { min_km: 0, max_km: null, fare_inr: 20 },
        ],
      };
      const res = FareRuleSchema.safeParse(rule);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("strictly greater than min_km"))).toBe(true);
      }
    });

    it("5. Rejects interior null max_km", () => {
      const rule = {
        ...validVerifiedFareRule,
        bands: [
          { min_km: 0, max_km: null, fare_inr: 10 },
          { min_km: 5, max_km: null, fare_inr: 20 },
        ],
      };
      const res = FareRuleSchema.safeParse(rule);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("only the last band can have max_km null"))).toBe(true);
      }
    });

    it("6. Rejects last band having a non-null max_km", () => {
      const rule = {
        ...validVerifiedFareRule,
        bands: [
          { min_km: 0, max_km: 5, fare_inr: 10 },
          { min_km: 5, max_km: 20, fare_inr: 20 },
        ],
      };
      const res = FareRuleSchema.safeParse(rule);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("last band max_km must be null"))).toBe(true);
      }
    });

    it("7. Rejects non-integer fare_inr", () => {
      const rule = {
        ...validVerifiedFareRule,
        bands: [
          { min_km: 0, max_km: 5, fare_inr: 10.5 },
          { min_km: 5, max_km: null, fare_inr: 20 },
        ],
      };
      const res = FareRuleSchema.safeParse(rule);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.path.includes("fare_inr"))).toBe(true);
      }
    });

    it("8. Rejects decreasing fares with distance", () => {
      const rule = {
        ...validVerifiedFareRule,
        bands: [
          { min_km: 0, max_km: 5, fare_inr: 20 },
          { min_km: 5, max_km: null, fare_inr: 10 },
        ],
      };
      const res = FareRuleSchema.safeParse(rule);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("fares must be non-decreasing with distance"))).toBe(true);
      }
    });
  });

  describe("Validator: Service Hours Rules", () => {
    it("9. Rejects invalid time format", () => {
      const badFirst = { ...validServiceHours, first_train: "5:30" };
      expect(ServiceHoursSchema.safeParse(badFirst).success).toBe(false);

      const badHour = { ...validServiceHours, first_train: "25:00" };
      expect(ServiceHoursSchema.safeParse(badHour).success).toBe(false);

      const badMinute = { ...validServiceHours, last_train: "23:61" };
      expect(ServiceHoursSchema.safeParse(badMinute).success).toBe(false);
    });

    it("10. Rejects last_train earlier than first_train when crosses_midnight is false", () => {
      const sh = {
        ...validServiceHours,
        first_train: "06:00",
        last_train: "00:30",
        last_train_crosses_midnight: false,
      };
      const res = ServiceHoursSchema.safeParse(sh);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("last_train_crosses_midnight must be true"))).toBe(true);
      }
    });

    it("11. Rejects last_train later than first_train when crosses_midnight is true", () => {
      const sh = {
        ...validServiceHours,
        first_train: "06:00",
        last_train: "23:00",
        last_train_crosses_midnight: true,
      };
      const res = ServiceHoursSchema.safeParse(sh);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("last_train is not earlier than first_train"))).toBe(true);
      }
    });

    it("12. Rejects duplicate composite key (line_id, station_id, towards_station_id, day_type)", () => {
      const shList = [
        validServiceHours,
        { ...validServiceHours, id: "mock-timing-dup" },
      ];
      const res = validateServiceHours(
        shList,
        { lines: [mockLine1], stations: [mockStation1, mockStation2] },
        { currentDate: clock }
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("Duplicate service hours entry"))).toBe(true);
    });
  });

  describe("Validator: Relational Integrity Rules", () => {
    it("13. Rejects unknown line_id in FareRule", () => {
      const rule = {
        ...validVerifiedFareRule,
        applies_to_line_ids: ["non-existent-line"],
      };
      const res = validateFareRules(
        [rule],
        { cities: [mockCity], lines: [mockLine1] },
        { currentDate: clock }
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("references unknown line_id 'non-existent-line'"))).toBe(true);
    });

    it("14. Rejects line not in city_id in FareRule", () => {
      const otherCity: City = {
        ...mockCity,
        id: "mock-city-mumbai",
        name: "Mock Mumbai",
      };
      const otherLine: Line = {
        ...mockLine1,
        id: "mock-line-mumbai-1",
        city_id: "mock-city-mumbai",
        city: "Mock Mumbai",
      };
      const rule = {
        ...validVerifiedFareRule,
        city_id: "mock-city-delhi",
        applies_to_line_ids: [otherLine.id],
      };
      const res = validateFareRules(
        [rule],
        { cities: [mockCity, otherCity], lines: [otherLine] },
        { currentDate: clock }
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("cannot apply to line") && e.includes("belonging to city"))).toBe(true);
    });

    it("15. Rejects a line appearing in multiple FareRules", () => {
      const rule1 = { ...validVerifiedFareRule, id: "mock-fare-1" };
      const rule2 = { ...validVerifiedFareRule, id: "mock-fare-2" };
      const res = validateFareRules(
        [rule1, rule2],
        { cities: [mockCity], lines: [mockLine1] },
        { currentDate: clock }
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("appears in multiple fare rules"))).toBe(true);
    });

    it("16. Rejects unknown line_id in ServiceHours", () => {
      const sh = { ...validServiceHours, line_id: "unknown-line" };
      const res = validateServiceHours(
        [sh],
        { lines: [mockLine1], stations: [mockStation1, mockStation2] },
        { currentDate: clock }
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("references unknown line_id 'unknown-line'"))).toBe(true);
    });

    it("17. Rejects unknown station_id in ServiceHours", () => {
      const sh = { ...validServiceHours, station_id: "unknown-station" };
      const res = validateServiceHours(
        [sh],
        { lines: [mockLine1], stations: [mockStation1, mockStation2] },
        { currentDate: clock }
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("references unknown station_id 'unknown-station'"))).toBe(true);
    });

    it("18. Rejects station that does not belong to line in ServiceHours", () => {
      const unlinkedStation: StationFeature = {
        ...mockStation1,
        properties: {
          ...mockStation1.properties,
          station_id: "mock-station-unlinked",
          line_ids: ["other-line"],
        },
      };
      const sh = {
        ...validServiceHours,
        station_id: "mock-station-unlinked",
      };
      const res = validateServiceHours(
        [sh],
        { lines: [mockLine1], stations: [unlinkedStation] },
        { currentDate: clock }
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("does not belong to line"))).toBe(true);
    });

    it("19. Rejects unknown towards_station_id in ServiceHours", () => {
      const sh = {
        ...validServiceHours,
        towards_station_id: "unknown-towards-station",
      };
      const res = validateServiceHours(
        [sh],
        { lines: [mockLine1], stations: [mockStation1, mockStation2] },
        { currentDate: clock }
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("references unknown towards_station_id 'unknown-towards-station'"))).toBe(true);
    });

    it("20. Rejects towards_station_id matching station_id", () => {
      const sh = {
        ...validServiceHours,
        station_id: "mock-station-rithala",
        towards_station_id: "mock-station-rithala",
      };
      const res = validateServiceHours(
        [sh],
        { lines: [mockLine1], stations: [mockStation1] },
        { currentDate: clock }
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("towards_station_id cannot be the same as station_id"))).toBe(true);
    });
  });

  describe("Validator: Provenance Rules", () => {
    it("21. Rejects root-path source_url for verified FareRule", () => {
      const rootRule1 = {
        ...validVerifiedFareRule,
        provenance: {
          ...validVerifiedFareRule.provenance,
          source_url: "https://delhimetrorail.com",
        },
      };
      expect(FareRuleSchema.safeParse(rootRule1).success).toBe(false);

      const rootRule2 = {
        ...validVerifiedFareRule,
        provenance: {
          ...validVerifiedFareRule.provenance,
          source_url: "https://delhimetrorail.com/",
        },
      };
      expect(FareRuleSchema.safeParse(rootRule2).success).toBe(false);
    });

    it("22. Rejects root-path source_url for verified ServiceHours", () => {
      const rootSh = {
        ...validServiceHours,
        provenance: {
          ...validServiceHours.provenance,
          source_url: "https://delhimetrorail.com",
        },
      };
      expect(ServiceHoursSchema.safeParse(rootSh).success).toBe(false);
    });

    it("23. Rejects non-allowlisted host for verified FareRule and ServiceHours", () => {
      const nonAllowlistedFare = {
        ...validVerifiedFareRule,
        provenance: {
          ...validVerifiedFareRule.provenance,
          source_url: "https://example.com/fare-table",
        },
      };
      const resFare = FareRuleSchema.safeParse(nonAllowlistedFare);
      expect(resFare.success).toBe(false);
      if (!resFare.success) {
        expect(resFare.error.issues.some((i) => i.message.includes("official-host allowlist"))).toBe(true);
      }

      const nonAllowlistedSh = {
        ...validServiceHours,
        provenance: {
          ...validServiceHours.provenance,
          source_url: "https://example.com/train-timings",
        },
      };
      const resSh = ServiceHoursSchema.safeParse(nonAllowlistedSh);
      expect(resSh.success).toBe(false);
      if (!resSh.success) {
        expect(resSh.error.issues.some((i) => i.message.includes("official-host allowlist"))).toBe(true);
      }
    });

    it("24. Rejects news and blog hosts", () => {
      const newsRule = {
        ...validVerifiedFareRule,
        provenance: {
          ...validVerifiedFareRule.provenance,
          source_url: "https://themetrorailguy.com/delhi-metro-fare-chart",
        },
      };
      const res = FareRuleSchema.safeParse(newsRule);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("News and blog hosts are never added"))).toBe(true);
      }
    });

    it("25. Accepts verified FareRule without effective_from when note is present, rejects when note is absent", () => {
      // Accepted with a note
      const acceptedWithNote = {
        ...validVerifiedFareRule,
        effective_from: undefined,
        provenance: {
          ...validVerifiedFareRule.provenance,
          note: "Official page states no effective date",
        },
      };
      const resAccepted = FareRuleSchema.safeParse(acceptedWithNote);
      expect(resAccepted.success).toBe(true);

      // Rejected without a note
      const rejectedNoNote = {
        ...validVerifiedFareRule,
        effective_from: undefined,
        provenance: {
          ...validVerifiedFareRule.provenance,
          note: undefined,
        },
      };
      const resNoNote = FareRuleSchema.safeParse(rejectedNoNote);
      expect(resNoNote.success).toBe(false);
      if (!resNoNote.success) {
        expect(resNoNote.error.issues.some((i) => i.message.includes("requires a non-empty note"))).toBe(true);
      }

      // Rejected with empty whitespace note
      const rejectedEmptyNote = {
        ...validVerifiedFareRule,
        effective_from: undefined,
        provenance: {
          ...validVerifiedFareRule.provenance,
          note: "   ",
        },
      };
      const resEmpty = FareRuleSchema.safeParse(rejectedEmptyNote);
      expect(resEmpty.success).toBe(false);
      if (!resEmpty.success) {
        expect(resEmpty.error.issues.some((i) => i.message.includes("requires a non-empty note"))).toBe(true);
      }
    });

    it("26. Rejects invalid calendar date for effective_from", () => {
      const invalidDate = {
        ...validVerifiedFareRule,
        effective_from: "2026-02-31",
      };
      const res = FareRuleSchema.safeParse(invalidDate);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("valid calendar date"))).toBe(true);
      }
    });

    it("27. Rejects future last_verified date", () => {
      const futureFare = {
        ...validVerifiedFareRule,
        provenance: {
          ...validVerifiedFareRule.provenance,
          last_verified: "2027-01-01",
        },
      };
      const resFare = validateFareRules(
        [futureFare],
        { cities: [mockCity], lines: [mockLine1] },
        { currentDate: clock }
      );
      expect(resFare.valid).toBe(false);
      expect(resFare.errors.some((e) => e.includes("last_verified cannot be in the future"))).toBe(true);

      const futureSh = {
        ...validServiceHours,
        provenance: {
          ...validServiceHours.provenance,
          last_verified: "2027-01-01",
        },
      };
      const resSh = validateServiceHours(
        [futureSh],
        { lines: [mockLine1], stations: [mockStation1, mockStation2] },
        { currentDate: clock }
      );
      expect(resSh.valid).toBe(false);
      expect(resSh.errors.some((e) => e.includes("last_verified cannot be in the future"))).toBe(true);
    });

    it("28. Passes valid verified FareRule and ServiceHours", () => {
      const resFare = validateFareRules(
        [validVerifiedFareRule],
        { cities: [mockCity], lines: [mockLine1] },
        { currentDate: clock }
      );
      expect(resFare.valid).toBe(true);
      expect(resFare.errors).toHaveLength(0);

      const resSh = validateServiceHours(
        [validServiceHours],
        { lines: [mockLine1], stations: [mockStation1, mockStation2] },
        { currentDate: clock }
      );
      expect(resSh.valid).toBe(true);
      expect(resSh.errors).toHaveLength(0);
    });

    it("29. Passes unverified FareRule without source_url or last_verified", () => {
      const unverifiedRule: FareRule = {
        ...validVerifiedFareRule,
        id: "mock-fare-unverified",
        effective_from: undefined,
        provenance: { status: "unverified" },
      };
      const resFare = validateFareRules(
        [unverifiedRule],
        { cities: [mockCity], lines: [mockLine1] },
        { currentDate: clock }
      );
      expect(resFare.valid).toBe(true);
      expect(resFare.errors).toHaveLength(0);

      const unverifiedSh: ServiceHours = {
        ...validServiceHours,
        id: "mock-timing-unverified",
        provenance: { status: "unverified" },
      };
      const resSh = validateServiceHours(
        [unverifiedSh],
        { lines: [mockLine1], stations: [mockStation1, mockStation2] },
        { currentDate: clock }
      );
      expect(resSh.valid).toBe(true);
      expect(resSh.errors).toHaveLength(0);
    });
  });

  describe("Calculator & Gating (lib/fares.ts)", () => {
    it("30. Matches exact lower band edge at 0 km", () => {
      const res = estimateFare(validVerifiedFareRule, 0);
      expect(res.band_index).toBe(0);
      expect(res.fare_inr).toBe(10);
      expect(res.near_boundary).toBe(false);
      expect(res.day_scope).toBe("mon_sat");
    });

    it("31. Matches exact band boundary at [min_km, max_km)", () => {
      // Band 0 is [0, 2), Band 1 is [2, 5)
      // Exactly 2.0 km belongs to Band 1
      const res = estimateFare(validVerifiedFareRule, 2.0);
      expect(res.band_index).toBe(1);
      expect(res.fare_inr).toBe(20);
      expect(res.near_boundary).toBe(true);
      expect(res.alternative_fare_inr).toBe(10);
    });

    it("32. Matches just below a band max", () => {
      // 1.99 km is in Band 0 [0, 2)
      const res = estimateFare(validVerifiedFareRule, 1.99);
      expect(res.band_index).toBe(0);
      expect(res.fare_inr).toBe(10);
      expect(res.near_boundary).toBe(true);
      expect(res.alternative_fare_inr).toBe(20);
    });

    it("33. Matches open-ended last band", () => {
      // Last band is [32, null) -> 60 INR
      const res = estimateFare(validVerifiedFareRule, 55.4);
      expect(res.band_index).toBe(5);
      expect(res.fare_inr).toBe(60);
      expect(res.near_boundary).toBe(false);
      expect(res.alternative_fare_inr).toBeUndefined();
    });

    it("34. Detects near_boundary on upper edge with alternative fare", () => {
      // Band 0 [0, 2), tolerance 0.5. At 1.8 km, distance to max_km (2) is 0.2 <= 0.5
      const res = estimateFare(validVerifiedFareRule, 1.8, { boundaryToleranceKm: 0.5 });
      expect(res.near_boundary).toBe(true);
      expect(res.alternative_fare_inr).toBe(20);
    });

    it("35. Returns near_boundary false when well inside band", () => {
      // Band 1 [2, 5), tolerance 0.5. At 3.5 km, distance to edges is 1.5 > 0.5
      const res = estimateFare(validVerifiedFareRule, 3.5, { boundaryToleranceKm: 0.5 });
      expect(res.near_boundary).toBe(false);
      expect(res.alternative_fare_inr).toBeUndefined();
    });

    it("36. Detects near_boundary on lower edge with alternative fare", () => {
      // Band 1 [2, 5), tolerance 0.5. At 2.2 km, distance to min_km (2) is 0.2 <= 0.5
      const res = estimateFare(validVerifiedFareRule, 2.2, { boundaryToleranceKm: 0.5 });
      expect(res.near_boundary).toBe(true);
      expect(res.alternative_fare_inr).toBe(10);
    });

    it("37. Does not set lower alternative fare near 0 km in Band 0", () => {
      // At 0.2 km in Band 0, distance to 0 is 0.2, but there is no previous band
      const res = estimateFare(validVerifiedFareRule, 0.2, { boundaryToleranceKm: 0.5 });
      expect(res.near_boundary).toBe(false);
      expect(res.alternative_fare_inr).toBeUndefined();
    });

    it("38. Estimates single-group route (1 leg)", () => {
      const legs = [{ line_id: "mock-line-red", distance_km: 8.5 }];
      const res = estimateRouteFare(legs, [validVerifiedFareRule]);
      expect(res).not.toBeNull();
      expect(res?.groups).toHaveLength(1);
      expect(res?.groups[0].day_scope).toBe("mon_sat");
      expect(res?.day_scope).toBe("mon_sat");
      expect(res?.total_fare_inr).toBe(30); // 8.5 km falls in [5, 12) -> 30 INR
      expect(res?.separate_tickets).toBe(false);
    });

    it("39. Groups consecutive legs sharing the same fare rule", () => {
      const ruleShared: FareRule = createMockFareRule({
        applies_to_line_ids: ["mock-line-red", "mock-line-blue"],
      });
      // Leg 1: 3 km, Leg 2: 4 km -> total consecutive distance 7 km in [5, 12) -> 30 INR
      const legs = [
        { line_id: "mock-line-red", distance_km: 3.0 },
        { line_id: "mock-line-blue", distance_km: 4.0 },
      ];
      const res = estimateRouteFare(legs, [ruleShared]);
      expect(res).not.toBeNull();
      expect(res?.groups).toHaveLength(1);
      expect(res?.groups[0].distance_km).toBe(7.0);
      expect(res?.groups[0].line_ids).toEqual(["mock-line-red", "mock-line-blue"]);
      expect(res?.groups[0].day_scope).toBe("mon_sat");
      expect(res?.day_scope).toBe("mon_sat");
      expect(res?.total_fare_inr).toBe(30);
      expect(res?.separate_tickets).toBe(false);
    });

    it("40. Splits non-consecutive or different fare rules into separate groups", () => {
      const rule2: FareRule = createMockFareRule({
        id: "mock-fare-delhi-airport",
        applies_to_line_ids: ["mock-line-blue"],
        day_scope: "all",
        bands: [
          { min_km: 0, max_km: 10, fare_inr: 50 },
          { min_km: 10, max_km: null, fare_inr: 100 },
        ],
      });
      const legs = [
        { line_id: "mock-line-red", distance_km: 3.0 }, // rule 1: 3 km in [2, 5) -> 20 INR
        { line_id: "mock-line-blue", distance_km: 12.0 }, // rule 2: 12 km in [10, null) -> 100 INR
      ];
      const res = estimateRouteFare(legs, [validVerifiedFareRule, rule2]);
      expect(res).not.toBeNull();
      expect(res?.groups).toHaveLength(2);
      expect(res?.groups[0].day_scope).toBe("mon_sat");
      expect(res?.groups[1].day_scope).toBe("all");
      expect(res?.total_fare_inr).toBe(120);
      expect(res?.separate_tickets).toBe(true);
    });

    it("41. Returns null if any leg lacks a verified fare rule", () => {
      const legs = [
        { line_id: "mock-line-red", distance_km: 3.0 },
        { line_id: "mock-line-unverified", distance_km: 4.0 },
      ];
      const res = estimateRouteFare(legs, [validVerifiedFareRule]);
      expect(res).toBeNull();
    });

    it("42. Ignores unverified fare rules", () => {
      const unverifiedRule: FareRule = {
        ...validVerifiedFareRule,
        provenance: { status: "unverified" },
      };
      expect(getFareRuleForLine("mock-line-red", [unverifiedRule])).toBeNull();

      const legs = [{ line_id: "mock-line-red", distance_km: 3.0 }];
      expect(estimateRouteFare(legs, [unverifiedRule])).toBeNull();
    });

    it("43. hasSourcedFares returns true only when verified FareRule exists", () => {
      expect(hasSourcedFares("mock-city-delhi", [])).toBe(false);

      const unverifiedRule: FareRule = {
        ...validVerifiedFareRule,
        provenance: { status: "unverified" },
      };
      expect(hasSourcedFares("mock-city-delhi", [unverifiedRule])).toBe(false);
      expect(hasSourcedFares("mock-city-delhi", [validVerifiedFareRule])).toBe(true);
      expect(hasSourcedFares("other-city", [validVerifiedFareRule])).toBe(false);
    });

    it("44. Rejects invalid input (negative distance, NaN)", () => {
      expect(() => estimateFare(validVerifiedFareRule, -1)).toThrow(/Invalid distance/);
      expect(() => estimateFare(validVerifiedFareRule, NaN)).toThrow(/Invalid distance/);

      expect(() =>
        estimateRouteFare(
          [{ line_id: "mock-line-red", distance_km: -5 }],
          [validVerifiedFareRule]
        )
      ).toThrow(/Invalid route leg/);

      expect(() =>
        estimateRouteFare(
          [{ line_id: "mock-line-red", distance_km: NaN }],
          [validVerifiedFareRule]
        )
      ).toThrow(/Invalid route leg/);
    });

    it("45. getServiceHours returns verified entries and ignores unverified", () => {
      const unverifiedSh: ServiceHours = {
        ...validServiceHours,
        id: "mock-timing-unverified",
        provenance: { status: "unverified" },
      };
      const hours = [validServiceHours, unverifiedSh];

      const res = getServiceHours(
        "mock-line-red",
        "mock-station-rithala",
        hours
      );
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe("mock-timing-red-rithala-weekday");

      // Non-matching station returns empty array
      expect(getServiceHours("mock-line-red", "other-station", hours)).toHaveLength(0);
    });
  });

  describe("M21b Real Data Gating & Verification Tests", () => {
    // a. for every city in the dataset, hasSourcedFares(city) equals whether a verified FareRule exists for it in the real data
    it("46. for every city in dataset, hasSourcedFares(city.id) matches whether verified FareRule exists in real data", () => {
      const typedFares = realFares as FareRule[];
      for (const city of realCities as City[]) {
        const hasVerifiedRule = typedFares.some(
          (rule) => rule.city_id === city.id && rule.provenance?.status === "verified"
        );
        expect(hasSourcedFares(city.id, typedFares)).toBe(hasVerifiedRule);
      }
    });

    // b. every verified real FareRule and ServiceHours has a non-root source_url, an allowlisted host, last_verified, and (for fares) effective_from or non-empty note
    it("47. every verified real FareRule and ServiceHours has non-root source_url, allowlisted host, last_verified, and effective_from", () => {
      const typedFares = realFares as FareRule[];
      const typedTimings = realTimings as ServiceHours[];

      for (const rule of typedFares) {
        if (rule.provenance.status === "verified") {
          expect(rule.provenance.source_url).toBeDefined();
          expect(rule.provenance.last_verified).toBeDefined();
          if (!rule.effective_from) {
            expect(rule.provenance.note).toBeDefined();
            expect(rule.provenance.note!.trim().length).toBeGreaterThan(0);
          } else {
            expect(rule.effective_from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          }

          const parsedUrl = new URL(rule.provenance.source_url!);
          expect(parsedUrl.pathname).not.toBe("/");
          expect(parsedUrl.pathname).not.toBe("");
          expect(isOfficialSourceHost(parsedUrl.hostname)).toBe(true);
        }
      }

      for (const sh of typedTimings) {
        if (sh.provenance.status === "verified") {
          expect(sh.provenance.source_url).toBeDefined();
          expect(sh.provenance.last_verified).toBeDefined();

          const parsedUrl = new URL(sh.provenance.source_url!);
          expect(parsedUrl.pathname).not.toBe("/");
          expect(parsedUrl.pathname).not.toBe("");
          expect(isOfficialSourceHost(parsedUrl.hostname)).toBe(true);
        }
      }
    });

    // c. estimateRouteFare returns null for a route that uses a line without a verified rule (build the route from real line ids)
    it("48. estimateRouteFare returns null for a route using real lines without a verified rule", () => {
      const typedFares = realFares as FareRule[];
      const typedLines = realLines as Line[];

      const linesWithoutVerifiedRule = typedLines.filter(
        (l) => !getFareRuleForLine(l.id, typedFares)
      );

      if (linesWithoutVerifiedRule.length > 0) {
        // e.g. del-airport or lines from other cities
        const chosenLine = linesWithoutVerifiedRule[0];
        const route = [{ line_id: chosenLine.id, distance_km: 5.0 }];
        const estimate = estimateRouteFare(route, typedFares);
        expect(estimate).toBeNull();
      } else {
        console.log("Notice: No unverified lines exist in real data; keeping mock-based unverified coverage.");
        const mockRoute = [{ line_id: "mock-unverified-line", distance_km: 5.0 }];
        const estimate = estimateRouteFare(mockRoute, typedFares);
        expect(estimate).toBeNull();
      }
    });
  });
});


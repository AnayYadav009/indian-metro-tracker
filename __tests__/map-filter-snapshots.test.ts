import { describe, it, expect } from "vitest";

function currentBuildStatusFilter(
  status: "operational" | "construction" | "planned",
  selectedStatuses: string[],
  selectedCityId: string | null,
  selectedPhases: string[]
) {
  if (!selectedStatuses.includes(status)) {
    return ["==", ["get", "status"], "__NONE__"];
  }
  const conditions: unknown[] = ["all", ["==", ["get", "status"], status]];

  if (selectedCityId) {
    conditions.push(["==", ["get", "city_id"], selectedCityId]);
  }

  if (selectedPhases.length > 0) {
    conditions.push(["in", ["get", "phase"], ["literal", selectedPhases]]);
  }

  return conditions;
}

function currentBuildStationFilter(
  selectedStatuses: string[],
  selectedCityId: string | null,
  selectedPhases: string[]
) {
  const conditions: unknown[] = ["all"];

  if (selectedStatuses.length < 3) {
    conditions.push(["in", ["get", "status"], ["literal", selectedStatuses]]);
  }

  if (selectedCityId) {
    conditions.push(["==", ["get", "city_id"], selectedCityId]);
  }

  if (selectedPhases.length > 0) {
    conditions.push(["in", ["get", "phase"], ["literal", selectedPhases]]);
  }

  return conditions.length === 1 ? undefined : conditions;
}

describe("MapLibre Layer Filter Expressions Characterization", () => {
  const testCases = [
    {
      desc: "default state (all statuses, no city, no phases)",
      statuses: ["operational", "construction", "planned"],
      cityId: null,
      phases: [] as string[],
    },
    {
      desc: "city selected with all statuses and specific phases",
      statuses: ["operational", "construction", "planned"],
      cityId: "delhi",
      phases: ["III", "IV"],
    },
    {
      desc: "single status selected with city and no phases",
      statuses: ["construction"],
      cityId: "mumbai",
      phases: [] as string[],
    },
    {
      desc: "status disabled (operational filtered out)",
      statuses: ["planned"],
      cityId: "bengaluru",
      phases: ["Phase 2"],
    },
    {
      desc: "no statuses selected",
      statuses: [] as string[],
      cityId: null,
      phases: [] as string[],
    },
  ];

  for (const tc of testCases) {
    it(`generates correct operational filter for: ${tc.desc}`, () => {
      const filter = currentBuildStatusFilter("operational", tc.statuses, tc.cityId, tc.phases);
      expect(filter).toMatchSnapshot();
    });

    it(`generates correct construction filter for: ${tc.desc}`, () => {
      const filter = currentBuildStatusFilter("construction", tc.statuses, tc.cityId, tc.phases);
      expect(filter).toMatchSnapshot();
    });

    it(`generates correct planned filter for: ${tc.desc}`, () => {
      const filter = currentBuildStatusFilter("planned", tc.statuses, tc.cityId, tc.phases);
      expect(filter).toMatchSnapshot();
    });

    it(`generates correct station filter for: ${tc.desc}`, () => {
      const filter = currentBuildStationFilter(tc.statuses, tc.cityId, tc.phases);
      expect(filter).toMatchSnapshot();
    });
  }
});

import { describe, it, expect } from "vitest";
import { validateMetroDataset } from "@/lib/data-validator";
import type { City, Line } from "@/types/metro";

describe("M19 Provenance Validator", () => {
  const clock = "2026-10-24";

  const makeDataset = (cityOverrides?: Partial<City>, lineOverrides?: Partial<Line>) => {
    const city = {
      id: "delhi",
      name: "Delhi",
      bbox: [76.84, 28.4, 77.35, 28.88] as [number, number, number, number],
      operator: "DMRC",
      phases: ["I"],
      provenance: { status: "unverified" as const },
      ...cityOverrides,
    };
    const line = {
      id: "del-red",
      name: "Red Line",
      city_id: "delhi",
      city: "Delhi",
      color: "#FF4040",
      operator: "DMRC",
      source: "osm",
      provenance: { status: "unverified" as const },
      ...lineOverrides,
    };
    return {
      cities: [city],
      lines: [line],
      segments: { type: "FeatureCollection" as const, features: [] },
      stations: { type: "FeatureCollection" as const, features: [] },
    };
  };

  it("1. Rejects missing provenance entirely", () => {
    const ds = makeDataset({ provenance: undefined as any });
    const res = validateMetroDataset(ds, { currentDate: clock });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("City 'delhi'") && e.includes("missing provenance"))).toBe(true);
  });

  it("2. Rejects missing status inside provenance", () => {
    const ds = makeDataset({}, { provenance: {} as any });
    const res = validateMetroDataset(ds, { currentDate: clock });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("Line 'del-red'") && e.includes("missing provenance status"))).toBe(true);
  });

  it("3. Rejects 'verified' status without source_url", () => {
    const ds = makeDataset({
      provenance: {
        status: "verified",
        last_verified: "2026-10-20",
      } as any,
    });
    const res = validateMetroDataset(ds, { currentDate: clock });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("City 'delhi'") && e.includes("verified status requires source_url"))).toBe(true);
  });

  it("4. Rejects 'verified' status without last_verified", () => {
    const ds = makeDataset({}, {
      provenance: {
        status: "verified",
        source_url: "https://delhimetrorail.com",
      } as any,
    });
    const res = validateMetroDataset(ds, { currentDate: clock });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("Line 'del-red'") && e.includes("verified status requires last_verified"))).toBe(true);
  });

  it("5. Rejects source_url with non-https scheme", () => {
    const ds = makeDataset({
      provenance: {
        status: "verified",
        source_url: "http://insecure-source.example.com",
        last_verified: "2026-10-20",
      },
    });
    const res = validateMetroDataset(ds, { currentDate: clock });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("City 'delhi'") && e.includes("must be an https URL"))).toBe(true);
  });

  it("6. Rejects last_verified with invalid date", () => {
    const ds = makeDataset({}, {
      provenance: {
        status: "verified",
        source_url: "https://example.com/source",
        last_verified: "2026-99-99",
      },
    });
    const res = validateMetroDataset(ds, { currentDate: clock });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("Line 'del-red'") && (e.includes("valid ISO date") || e.includes("valid calendar date")))).toBe(true);

    const dsMalformed = makeDataset({}, {
      provenance: {
        status: "verified",
        source_url: "https://example.com/source",
        last_verified: "not-a-date",
      },
    });
    const resMalformed = validateMetroDataset(dsMalformed, { currentDate: clock });
    expect(resMalformed.valid).toBe(false);
    expect(resMalformed.errors.some((e) => e.includes("Line 'del-red'") && e.includes("valid ISO date"))).toBe(true);
  });

  it("7. Rejects last_verified with future date", () => {
    const ds = makeDataset({
      provenance: {
        status: "verified",
        source_url: "https://example.com/source",
        last_verified: "2027-01-01",
      },
    });
    const res = validateMetroDataset(ds, { currentDate: clock });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("City 'delhi'") && e.includes("cannot be in the future"))).toBe(true);
  });

  it("8. Passes unverified with no source_url or last_verified", () => {
    const ds = makeDataset(
      { provenance: { status: "unverified" } },
      { provenance: { status: "unverified" } }
    );
    const res = validateMetroDataset(ds, { currentDate: clock });
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("9. Passes verified with valid https source and past/present date", () => {
    const ds = makeDataset(
      {
        provenance: {
          status: "verified",
          source_url: "https://delhimetrorail.com",
          last_verified: "2026-10-20",
          note: "Official DMRC website",
        },
      },
      {
        provenance: {
          status: "verified",
          source_url: "https://delhimetrorail.com/red-line",
          last_verified: "2026-10-24",
        },
      }
    );
    const res = validateMetroDataset(ds, { currentDate: clock });
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });
});

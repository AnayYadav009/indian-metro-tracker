import { describe, it, expect } from "vitest";
import { OFFICIAL_SOURCE_HOSTS, isOfficialSourceHost } from "../lib/official-source-hosts";

describe("Official Source Hosts Allowlist", () => {
  it("includes central government press release portals pib.gov.in and pmindia.gov.in", () => {
    expect(OFFICIAL_SOURCE_HOSTS).toContain("pib.gov.in");
    expect(OFFICIAL_SOURCE_HOSTS).toContain("www.pib.gov.in");
    expect(OFFICIAL_SOURCE_HOSTS).toContain("pmindia.gov.in");
    expect(OFFICIAL_SOURCE_HOSTS).toContain("www.pmindia.gov.in");
  });

  it("accepts valid official hostnames with isOfficialSourceHost", () => {
    expect(isOfficialSourceHost("pib.gov.in")).toBe(true);
    expect(isOfficialSourceHost("www.pib.gov.in")).toBe(true);
    expect(isOfficialSourceHost("pmindia.gov.in")).toBe(true);
    expect(isOfficialSourceHost("www.pmindia.gov.in")).toBe(true);
    expect(isOfficialSourceHost("delhimetrorail.com")).toBe(true);
    expect(isOfficialSourceHost("chennaimetrorail.org")).toBe(true);
    expect(isOfficialSourceHost("pmrda.gov.in")).toBe(true);
  });

  it("handles case-insensitivity and whitespace trimming", () => {
    expect(isOfficialSourceHost("  PIB.GOV.IN  ")).toBe(true);
    expect(isOfficialSourceHost("PMINDIA.GOV.IN")).toBe(true);
  });

  it("strictly rejects news, blogs, aggregators, and unapproved domains", () => {
    expect(isOfficialSourceHost("narendramodi.in")).toBe(false);
    expect(isOfficialSourceHost("themetrorailguy.com")).toBe(false);
    expect(isOfficialSourceHost("thehindu.com")).toBe(false);
    expect(isOfficialSourceHost("timesofindia.indiatimes.com")).toBe(false);
    expect(isOfficialSourceHost("railwaygazette.com")).toBe(false);
    expect(isOfficialSourceHost("dtnext.in")).toBe(false);
  });
});

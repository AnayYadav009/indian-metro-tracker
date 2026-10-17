import { describe, it, expect } from "vitest";
import citiesJson from "@/data/cities.json";
import {
  generateCityMetadata,
  generateCityJsonLd,
  getCityCanonicalUrl,
  getCityDescription,
} from "@/lib/city-seo";
import { getCityPageData, getAllCities } from "@/lib/city-page-data";
import { SITE_CONFIG } from "@/lib/site-config";

describe("M17 City SEO & Metadata Generation", () => {
  it("provides data for all 21 cities in data/cities.json", () => {
    const allCities = getAllCities();
    expect(allCities).toHaveLength(21);

    for (const city of allCities) {
      const pageData = getCityPageData(city.id);
      expect(pageData).not.toBeNull();
      expect(pageData?.city.name).toBe(city.name);
      expect(pageData?.stats.cityId).toBe(city.id);
      expect(pageData?.lines.length).toBeGreaterThan(0);
    }
  });

  it("generates unique title, meta description, and canonical URL for every city", () => {
    const canonicals = new Set<string>();
    const titles = new Set<string>();

    for (const city of citiesJson) {
      const meta = generateCityMetadata(city.id);
      expect(meta.title).toContain(city.name);
      expect(meta.title).toContain("Metro Network");
      expect(meta.description).toBeDefined();
      expect(typeof meta.description).toBe("string");
      expect((meta.description as string).length).toBeGreaterThan(20);

      const canonical = (meta.alternates?.canonical as string) || "";
      expect(canonical).toBe(`${SITE_CONFIG.siteUrl}/city/${city.id}/`);
      expect(canonicals.has(canonical)).toBe(false);
      canonicals.add(canonical);

      expect(titles.has(meta.title as string)).toBe(false);
      titles.add(meta.title as string);

      // Verify OpenGraph and Twitter metadata
      expect(meta.openGraph?.title).toBe(meta.title);
      expect(meta.openGraph?.url).toBe(canonical);
      expect(meta.openGraph?.siteName).toBe(SITE_CONFIG.name);
      expect((meta.twitter as { card?: string })?.card).toBe(
        "summary_large_image"
      );
    }

    expect(canonicals.size).toBe(21);
    expect(titles.size).toBe(21);
  });

  it("handles cities with 0 operational stations (Surat) transparently in description", () => {
    const suratMeta = generateCityMetadata("surat");
    const suratDesc = suratMeta.description as string;
    expect(suratDesc).toContain("0 operational stations currently open");
    expect(suratDesc).toContain("under active construction");

    const suratData = getCityPageData("surat");
    expect(suratData?.isUnderConstructionOnly).toBe(true);
    expect(suratData?.stats.operationalStations).toBe(0);
    expect(suratData?.stats.operationalKm).toBe(0);
    expect(suratData?.stats.constructionKm).toBeGreaterThan(0);
  });

  it("reflects verified priority corridor data for Patna", () => {
    const patnaData = getCityPageData("patna");
    expect(patnaData).not.toBeNull();
    expect(patnaData?.stats.operationalStations).toBe(5);
    expect(patnaData?.stats.operationalKm).toBeGreaterThan(5);
    expect(patnaData?.isUnderConstructionOnly).toBe(false);

    const patnaDesc = getCityDescription("patna");
    expect(patnaDesc).toContain("5 stations");
  });

  it("generates valid schema.org JSON-LD using only verified properties", () => {
    for (const city of citiesJson) {
      const jsonLd = generateCityJsonLd(city.id);
      expect(jsonLd).not.toBeNull();
      expect(jsonLd?.["@context"]).toBe("https://schema.org");
      expect(jsonLd?.["@type"]).toBe("ItemPage");
      expect(jsonLd?.name).toBe(`${city.name} Metro Network`);
      expect(jsonLd?.url).toBe(`${SITE_CONFIG.siteUrl}/city/${city.id}/`);

      const mainEntity = jsonLd?.mainEntity;
      expect(mainEntity?.["@type"]).toBe("City");
      expect(mainEntity?.name).toBe(city.name);

      // Verify center coordinates match city.bbox midpoint
      const [minLng, minLat, maxLng, maxLat] = city.bbox;
      const expectedLat = Math.round(((minLat + maxLat) / 2) * 10000) / 10000;
      const expectedLon = Math.round(((minLng + maxLng) / 2) * 10000) / 10000;

      expect(mainEntity?.geo["@type"]).toBe("GeoCoordinates");
      expect(mainEntity?.geo.latitude).toBe(expectedLat);
      expect(mainEntity?.geo.longitude).toBe(expectedLon);
    }
  });

  it("returns fallback metadata for non-existent city IDs gracefully", () => {
    const fallbackMeta = generateCityMetadata("non-existent-city");
    expect(fallbackMeta.title).toBe("City Not Found | Indian Metro Tracker");

    const fallbackJsonLd = generateCityJsonLd("non-existent-city");
    expect(fallbackJsonLd).toBeNull();
  });

  it("extracts line terminals and topologies correctly from reference data", () => {
    const delhiData = getCityPageData("delhi");
    expect(delhiData).not.toBeNull();

    const redLine = delhiData?.lines.find((l) => l.id === "del-red");
    expect(redLine).toBeDefined();
    expect(redLine?.terminals).toEqual(["Rithala", "Shaheed Sthal"]);

    const indoreData = getCityPageData("indore");
    expect(indoreData).not.toBeNull();
    const indoreYellow = indoreData?.lines.find((l) => l.id === "ind-yellow");
    expect(indoreYellow).toBeDefined();
    expect(indoreYellow?.topology).toBe("loop");
  });

  it("computes opening year ranges where station opened_on exists", () => {
    const kochiData = getCityPageData("kochi");
    expect(kochiData?.openingYearRange).toBe("2017 – 2024");
    expect(kochiData?.earliestOpenedYear).toBe(2017);
    expect(kochiData?.latestOpenedYear).toBe(2024);

    const suratData = getCityPageData("surat");
    expect(suratData?.openingYearRange).toBeNull();
  });
});

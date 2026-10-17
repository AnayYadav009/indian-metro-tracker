import type { Metadata } from "next";
import { getCityPageData } from "@/lib/city-page-data";
import { SITE_CONFIG } from "@/lib/site-config";

export function getCityCanonicalUrl(cityId: string): string {
  const baseUrl = SITE_CONFIG.siteUrl.replace(/\/$/, "");
  return `${baseUrl}/city/${cityId}/`;
}

export function getCityDescription(cityId: string): string {
  const data = getCityPageData(cityId);
  if (!data) return SITE_CONFIG.description;

  const { city, stats, isUnderConstructionOnly, openingYearRange, hasAtLeast80PercentOpened } = data;

  if (isUnderConstructionOnly) {
    return `${city.name} metro transit network overview: 0 operational stations currently open, with ${stats.constructionKm} km across ${stats.linesCount} lines under active construction. Grounded in verified geospatial data.`;
  }

  const yearClause =
    hasAtLeast80PercentOpened && openingYearRange
      ? ` (opened ${openingYearRange})`
      : "";
  return `${city.name} metro transit network overview: ${stats.operationalKm} km operational across ${stats.linesCount} lines and ${stats.operationalStations} stations${yearClause}. Verified geospatial data tracking operational, under-construction, and planned corridors.`;
}

export function generateCityMetadata(cityId: string): Metadata {
  const data = getCityPageData(cityId);
  if (!data) {
    return {
      title: "City Not Found | Indian Metro Tracker",
      description: SITE_CONFIG.description,
    };
  }

  const { city } = data;
  const title = `${city.name} Metro Network: Stats, Lines & Stations | Indian Metro Tracker`;
  const description = getCityDescription(cityId);
  const canonicalUrl = getCityCanonicalUrl(cityId);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export interface CityJsonLd {
  "@context": "https://schema.org";
  "@type": "ItemPage";
  name: string;
  url: string;
  description: string;
  mainEntity: {
    "@type": "City";
    name: string;
    geo?: {
      "@type": "GeoCoordinates";
      latitude: number;
      longitude: number;
    };
  };
}

export function generateCityJsonLd(cityId: string): CityJsonLd | null {
  const data = getCityPageData(cityId);
  if (!data) return null;

  const { city } = data;
  const canonicalUrl = getCityCanonicalUrl(cityId);
  const description = getCityDescription(cityId);

  // If city.center explicitly exists in cities.json, use it; do not compute GeoCoordinates from bbox midpoint
  const rawCenter = (city as { center?: [number, number] }).center;
  const geo =
    Array.isArray(rawCenter) && rawCenter.length === 2
      ? {
          "@type": "GeoCoordinates" as const,
          latitude: rawCenter[1],
          longitude: rawCenter[0],
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "ItemPage",
    name: `${city.name} Metro Network`,
    url: canonicalUrl,
    description,
    mainEntity: {
      "@type": "City",
      name: city.name,
      ...(geo ? { geo } : {}),
    },
  };
}

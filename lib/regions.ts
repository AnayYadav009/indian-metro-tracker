export interface Region {
  id: string;
  name: string;
  memberCityIds: string[];
  bbox: [number, number, number, number];
}

export const NCR_REGION: Region = {
  id: "ncr",
  name: "National Capital Region (NCR)",
  memberCityIds: ["delhi", "gurugram", "noida", "meerut", "namo-bharat"],
  bbox: [76.85, 28.25, 77.85, 29.15],
};

export const REGIONS: Region[] = [NCR_REGION];

export function getRegion(regionId: string | null | undefined): Region | undefined {
  if (!regionId) return undefined;
  return REGIONS.find((r) => r.id === regionId);
}

export function isRegionId(id: string | null | undefined): boolean {
  return REGIONS.some((r) => r.id === id);
}

export function getRegionMemberCityIds(regionId: string | null | undefined): string[] {
  const region = getRegion(regionId);
  return region ? region.memberCityIds : [];
}

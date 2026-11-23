export const TIER_1_CITY_IDS: ReadonlySet<string> = new Set([
  "delhi",
  "mumbai",
  "bengaluru",
  "chennai",
  "kolkata",
  "hyderabad",
]);

const TIER_1_ORDER = [...TIER_1_CITY_IDS];

export interface CityPickerOption {
  id: string;
  name: string;
  operator: string;
}

export function searchAndOrderCities<T extends CityPickerOption>(
  cities: readonly T[],
  query: string,
  selectedCityId: string | null
): T[] {
  const search = query.trim().toLocaleLowerCase();
  return cities
    .filter((city) =>
      [city.name, city.operator, city.id].some((value) =>
        value.toLocaleLowerCase().includes(search)
      )
    )
    .sort((a, b) => {
      if (a.id === selectedCityId) return -1;
      if (b.id === selectedCityId) return 1;
      const aTier = TIER_1_ORDER.indexOf(a.id);
      const bTier = TIER_1_ORDER.indexOf(b.id);
      if (aTier >= 0 || bTier >= 0) {
        if (aTier < 0) return 1;
        if (bTier < 0) return -1;
        return aTier - bTier;
      }
      return a.name.localeCompare(b.name);
    });
}

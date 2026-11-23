export const SITE_CONFIG = {
  name: "Indian Metro Tracker",
  description: "Track operational, under-construction, and planned metro lines across India.",
  repoUrl: "https://github.com/AnayYadav009/indian-metro-tracker",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://anayyadav009.github.io/indian-metro-tracker",
} as const;

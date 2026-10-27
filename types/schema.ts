import { z } from "zod";
import { isOfficialSourceHost } from "../lib/official-source-hosts";

export const StatusSchema = z.enum(["operational", "construction", "planned"]);

export const SharedCorridorSchema = z.object({
  segment_ids: z.array(z.string().min(1)).length(2),
  shared_station_ids: z.array(z.string().min(1)).min(2),
  reason: z.string().trim().min(1),
  source: z.string().url(),
});
export type SharedCorridor = z.infer<typeof SharedCorridorSchema>;
export type Status = z.infer<typeof StatusSchema>;

export const LayoutSchema = z.enum(["underground", "elevated", "at-grade"]);
export type Layout = z.infer<typeof LayoutSchema>;

export const BoundingBoxSchema = z.tuple([
  z.number(), // minLng
  z.number(), // minLat
  z.number(), // maxLng
  z.number(), // maxLat
]);
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const ProvenanceStatusSchema = z.enum(["verified", "schematic", "unverified"]);
export type ProvenanceStatus = z.infer<typeof ProvenanceStatusSchema>;

export const ProvenanceSchema = z
  .object({
    status: ProvenanceStatusSchema,
    source_url: z
      .string()
      .regex(/^https:\/\//, "source_url must be an https URL")
      .optional(),
    last_verified: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "last_verified must be YYYY-MM-DD")
      .optional(),
    note: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.status === "verified") {
      if (!val.source_url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "verified status requires source_url",
          path: ["source_url"],
        });
      } else {
        try {
          const parsed = new URL(val.source_url);
          const path = parsed.pathname;
          if (!path || path === "/" || path === "") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "verified status requires a source_url with a non-root path (bare homepage URLs are not allowed)",
              path: ["source_url"],
            });
          }
        } catch {
          // regex handles syntax errors
        }
      }
      if (!val.last_verified) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "verified status requires last_verified",
          path: ["last_verified"],
        });
      }
    }
    if (val.last_verified) {
      const parts = val.last_verified.split("-").map(Number);
      const [y, m, d] = parts;
      const date = new Date(Date.UTC(y, m - 1, d));
      if (
        isNaN(date.getTime()) ||
        date.getUTCFullYear() !== y ||
        date.getUTCMonth() !== m - 1 ||
        date.getUTCDate() !== d
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "last_verified must be a valid calendar date",
          path: ["last_verified"],
        });
      }
    }
  });
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const CitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  bbox: BoundingBoxSchema,
  operator: z.string().min(1),
  phases: z.array(z.string().min(1)).min(1),
  tier: z
    .union([z.literal(1), z.literal(2)])
    .default(1)
    .optional(),
  network_id: z.string().min(1).optional(),
  retrieved_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD")
    .optional(),
  provenance: ProvenanceSchema,
});
export type City = z.infer<typeof CitySchema>;

export const LineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  city_id: z.string().min(1),
  city: z.string().min(1),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid hex color"),
  operator: z.string().min(1),
  source: z.string().min(1, "source is required"),
  aliases: z.array(z.string().min(1)).default([]).optional(),
  ordered_station_ids: z.array(z.string().min(1)).optional(),
  retrieved_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD")
    .optional(),
  provenance: ProvenanceSchema,
});
export type Line = z.infer<typeof LineSchema>;

export const SegmentPropertiesSchema = z
  .object({
    segment_id: z.string().min(1),
    line_id: z.string().min(1),
    line_name: z.string().min(1),
    city_id: z.string().min(1),
    city: z.string().min(1),
    operator: z.string().min(1),
    status: StatusSchema,
    phase: z.string().min(1),
    length_km: z.number().positive(),
    official_length_km: z.number().positive().optional(),
    gauge: z.string().min(1),
    inaugurated_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD")
      .nullable(),
    expected_completion: z
      .string()
      .regex(/^(\d{4}-\d{2}|\d{4})$/, "Format must be YYYY-MM or YYYY")
      .nullable(),
    stations_count: z.number().int().nonnegative(),
    color: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid hex color"),
    source: z.string().min(1),
    references: z
      .array(
        z
          .string()
          .regex(/^https?:\/\//, "Reference must be a valid http or https URL")
      )
      .default([]),
    last_verified: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD")
      .nullable(),
    retrieved_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD")
      .optional(),
    completion_unconfirmed: z.boolean().default(false).optional(),
    geometry_quality: z
      .enum(["exact", "schematic"])
      .default("exact")
      .optional(),
    shared_corridor: SharedCorridorSchema.optional(),
    stations_not_published: z.boolean().default(false).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "operational") {
      if (data.geometry_quality === "schematic") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Operational segment must not have geometry_quality: 'schematic'",
          path: ["geometry_quality"],
        });
      }
      if (!data.inaugurated_on) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "inaugurated_on is required when status is 'operational'",
          path: ["inaugurated_on"],
        });
      }
      if (data.expected_completion !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "expected_completion must be null when status is 'operational'",
          path: ["expected_completion"],
        });
      }
    } else if (data.status === "construction") {
      if (!data.expected_completion && !data.completion_unconfirmed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "expected_completion is required when status is 'construction' unless completion_unconfirmed is true",
          path: ["expected_completion"],
        });
      }
      if (data.inaugurated_on !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "inaugurated_on must be null when status is 'construction'",
          path: ["inaugurated_on"],
        });
      }
    } else if (data.status === "planned") {
      if (data.inaugurated_on !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "inaugurated_on must be null when status is 'planned'",
          path: ["inaugurated_on"],
        });
      }
    }

    if (data.geometry_quality === "schematic") {
      if (!data.references.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Schematic geometry requires a source reference",
          path: ["references"],
        });
      }
    }

    const isManual = data.source.toLowerCase().includes("manual");
    const missingRefs = !data.references || data.references.length === 0;

    if (isManual && missingRefs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Manual segment '${data.segment_id}' requires at least one valid URL in 'references'`,
        path: ["references"],
      });
    }
  });
export type SegmentProperties = z.infer<typeof SegmentPropertiesSchema>;

export const SegmentFeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: z.object({
    type: z.literal("LineString"),
    coordinates: z
      .array(
        z.tuple([
          z.number().min(-180).max(180), // lng
          z.number().min(-90).max(90), // lat
        ])
      )
      .min(2, "LineString must have at least 2 coordinate points"),
  }),
  properties: SegmentPropertiesSchema,
});
export type SegmentFeature = z.infer<typeof SegmentFeatureSchema>;

export const SegmentFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(SegmentFeatureSchema),
});
export type SegmentFeatureCollection = z.infer<
  typeof SegmentFeatureCollectionSchema
>;

export const StationPropertiesSchema = z
  .object({
    station_id: z.string().min(1),
    name: z.string().min(1),
    city_id: z.string().min(1),
    city: z.string().min(1),
    line_ids: z.array(z.string().min(1)).min(1),
    segment_id: z.string().min(1).optional(),
    status: StatusSchema,
    phase: z.string().min(1),
    is_interchange: z.boolean(),
    opened_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD")
      .nullable(),
    expected_completion: z
      .string()
      .regex(/^(\d{4}-\d{2}|\d{4})$/, "Format must be YYYY-MM or YYYY")
      .nullable(),
    layout: LayoutSchema.nullable(),
    layout_source: z.enum(["operator", "osm-tag", "unverified"]).optional(),
    source: z.string().min(1, "source is required"),
    references: z
      .array(
        z
          .string()
          .regex(/^https?:\/\//, "Reference must be a valid http or https URL")
      )
      .optional(),
    last_verified: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD")
      .nullable(),
    retrieved_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD")
      .optional(),
    completion_unconfirmed: z.boolean().default(false).optional(),
    geometry_quality: z.enum(["exact", "schematic"]).default("exact").optional(),
    interchange_id: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "operational") {
      if (data.expected_completion !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "expected_completion must be null when status is 'operational'",
          path: ["expected_completion"],
        });
      }
    } else if (data.status === "construction") {
      if (!data.expected_completion && !data.completion_unconfirmed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "expected_completion is required when status is 'construction' unless completion_unconfirmed is true",
          path: ["expected_completion"],
        });
      }
      if (data.opened_on !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "opened_on must be null when status is 'construction'",
          path: ["opened_on"],
        });
      }
    } else if (data.status === "planned") {
      if (data.opened_on !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "opened_on must be null when status is 'planned'",
          path: ["opened_on"],
        });
      }
    }
  });
export type StationProperties = z.infer<typeof StationPropertiesSchema>;

export const StationFeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([
      z.number().min(-180).max(180), // lng
      z.number().min(-90).max(90), // lat
    ]),
  }),
  properties: StationPropertiesSchema,
});
export type StationFeature = z.infer<typeof StationFeatureSchema>;

export const StationFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(StationFeatureSchema),
});
export type StationFeatureCollection = z.infer<
  typeof StationFeatureCollectionSchema
>;

/* ==========================================================================
   Fare and Timing Schemas (Milestone M21a, M21e-1)
   ========================================================================== */

export const FareKmBandSchema = z.object({
  min_km: z.number().nonnegative(),
  max_km: z.number().positive().nullable(),
  fare_inr: z.number().int().nonnegative(),
});
export type FareKmBand = z.infer<typeof FareKmBandSchema>;

// Alias for backward compatibility with M21a
export const FareBandSchema = FareKmBandSchema;
export type FareBand = FareKmBand;

export const FareStationBandSchema = z.object({
  min_stations: z.number().int().positive(),
  max_stations: z.number().int().positive().nullable(),
  fare_inr: z.number().int().nonnegative(),
});
export type FareStationBand = z.infer<typeof FareStationBandSchema>;

export const FareDayScopeSchema = z.enum(["mon_sat", "sun_holiday", "all"]);
export type FareDayScope = z.infer<typeof FareDayScopeSchema>;

const BaseFareRuleSchema = z.object({
  id: z.string().min(1),
  city_id: z.string().min(1),
  operator: z.string().min(1),
  applies_to_line_ids: z.array(z.string().min(1)).min(1),
  ticket_type: z.literal("single_journey"),
  currency: z.literal("INR"),
  day_scope: FareDayScopeSchema,
  effective_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "effective_from must be YYYY-MM-DD")
    .optional(),
  provenance: ProvenanceSchema,
});

export const FareRuleKmSchema = BaseFareRuleSchema.extend({
  distance_basis: z.literal("computed_route_km"),
  bands: z.array(FareKmBandSchema).min(1),
});
export type FareRuleKm = z.infer<typeof FareRuleKmSchema>;

export const FareRuleStationCountSchema = BaseFareRuleSchema.extend({
  distance_basis: z.literal("station_count"),
  same_station_fare_inr: z.number().int().nonnegative().optional(),
  bands: z.array(FareStationBandSchema).min(1),
});
export type FareRuleStationCount = z.infer<typeof FareRuleStationCountSchema>;

export const FareRuleSchema = z
  .discriminatedUnion("distance_basis", [
    FareRuleKmSchema,
    FareRuleStationCountSchema,
  ])
  .superRefine((rule, ctx) => {
    // Verified FareRule requires allowlisted official source_url host.
    // effective_from is optional if the official page states none; if absent, a non-empty note is required.
    if (rule.provenance.status === "verified") {
      if (!rule.effective_from) {
        if (!rule.provenance.note || rule.provenance.note.trim() === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "verified FareRule without effective_from requires a non-empty note explaining that the official page states none",
            path: ["provenance", "note"],
          });
        }
      }
      if (rule.provenance.source_url) {
        try {
          const parsed = new URL(rule.provenance.source_url);
          if (!isOfficialSourceHost(parsed.hostname)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `source_url hostname '${parsed.hostname}' is not on the official-host allowlist. Host must be reviewed and added by the owner. News and blog hosts are never added.`,
              path: ["provenance", "source_url"],
            });
          }
        } catch {
          // handled by URL format regex
        }
      }
    }

    if (rule.effective_from) {
      const parts = rule.effective_from.split("-").map(Number);
      const [y, m, d] = parts;
      const date = new Date(Date.UTC(y, m - 1, d));
      if (
        isNaN(date.getTime()) ||
        date.getUTCFullYear() !== y ||
        date.getUTCMonth() !== m - 1 ||
        date.getUTCDate() !== d
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "effective_from must be a valid calendar date",
          path: ["effective_from"],
        });
      }
    }

    if (rule.distance_basis === "computed_route_km") {
      // Km band validation
      // 1. first min_km is 0
      if (rule.bands.length > 0 && rule.bands[0].min_km !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "first band min_km must be 0",
          path: ["bands", 0, "min_km"],
        });
      }

      for (let i = 0; i < rule.bands.length; i++) {
        const band = rule.bands[i];
        const isLast = i === rule.bands.length - 1;

        // 2. only the last band has max_km null
        if (band.max_km === null && !isLast) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "only the last band can have max_km null",
            path: ["bands", i, "max_km"],
          });
        }

        // 3. max_km > min_km if not null
        if (band.max_km !== null && band.max_km <= band.min_km) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `max_km (${band.max_km}) must be strictly greater than min_km (${band.min_km})`,
            path: ["bands", i, "max_km"],
          });
        }

        // 4. contiguous and non-overlapping: each min_km equals previous max_km
        if (i > 0) {
          const prevBand = rule.bands[i - 1];
          if (prevBand.max_km !== null && band.min_km !== prevBand.max_km) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `band ${i} min_km (${band.min_km}) must equal previous band max_km (${prevBand.max_km})`,
              path: ["bands", i, "min_km"],
            });
          }

          // 5. fares are non-decreasing with distance
          if (band.fare_inr < prevBand.fare_inr) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `fares must be non-decreasing with distance (band ${i} fare ${band.fare_inr} < previous ${prevBand.fare_inr})`,
              path: ["bands", i, "fare_inr"],
            });
          }
        }
      }

      const lastBand = rule.bands[rule.bands.length - 1];
      if (lastBand && lastBand.max_km !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "only the last band can have max_km null, and the last band max_km must be null",
          path: ["bands", rule.bands.length - 1, "max_km"],
        });
      }
    } else if (rule.distance_basis === "station_count") {
      // Station count band validation
      // 1. first min_stations is 1
      if (rule.bands.length > 0 && rule.bands[0].min_stations !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "first band min_stations must be 1",
          path: ["bands", 0, "min_stations"],
        });
      }

      for (let i = 0; i < rule.bands.length; i++) {
        const band = rule.bands[i];
        const isLast = i === rule.bands.length - 1;

        // 2. only the last band has max_stations null
        if (band.max_stations === null && !isLast) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "only the last band can have max_stations null",
            path: ["bands", i, "max_stations"],
          });
        }

        // 3. max_stations >= min_stations if not null
        if (band.max_stations !== null && band.max_stations < band.min_stations) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `max_stations (${band.max_stations}) must be greater than or equal to min_stations (${band.min_stations})`,
            path: ["bands", i, "max_stations"],
          });
        }

        // 4. contiguous: each min_stations equals previous max_stations + 1
        if (i > 0) {
          const prevBand = rule.bands[i - 1];
          if (
            prevBand.max_stations !== null &&
            band.min_stations !== prevBand.max_stations + 1
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `band ${i} min_stations (${band.min_stations}) must equal previous band max_stations + 1 (${prevBand.max_stations + 1})`,
              path: ["bands", i, "min_stations"],
            });
          }

          // 5. fares are non-decreasing
          if (band.fare_inr < prevBand.fare_inr) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `fares must be non-decreasing with station count (band ${i} fare ${band.fare_inr} < previous ${prevBand.fare_inr})`,
              path: ["bands", i, "fare_inr"],
            });
          }
        }
      }

      const lastBand = rule.bands[rule.bands.length - 1];
      if (lastBand && lastBand.max_stations !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "only the last band can have max_stations null, and the last band max_stations must be null",
          path: ["bands", rule.bands.length - 1, "max_stations"],
        });
      }
    }
  });
export type FareRule = z.infer<typeof FareRuleSchema>;

export const ServiceDayTypeSchema = z.enum([
  "weekday",
  "saturday",
  "sunday",
  "holiday",
  "all",
]);
export type ServiceDayType = z.infer<typeof ServiceDayTypeSchema>;

const timeFormatRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const ServiceHoursSchema = z
  .object({
    id: z.string().min(1),
    line_id: z.string().min(1),
    station_id: z.string().min(1),
    towards_station_id: z.string().min(1).optional(),
    day_type: ServiceDayTypeSchema,
    first_train: z.string().regex(timeFormatRegex, "first_train must be HH:MM in 24h format"),
    last_train: z.string().regex(timeFormatRegex, "last_train must be HH:MM in 24h format"),
    last_train_crosses_midnight: z.boolean(),
    provenance: ProvenanceSchema,
  })
  .superRefine((sh, ctx) => {
    // Verified ServiceHours requires allowlisted official source_url host
    if (sh.provenance.status === "verified" && sh.provenance.source_url) {
      try {
        const parsed = new URL(sh.provenance.source_url);
        if (!isOfficialSourceHost(parsed.hostname)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `source_url hostname '${parsed.hostname}' is not on the official-host allowlist. Host must be reviewed and added by the owner. News and blog hosts are never added.`,
            path: ["provenance", "source_url"],
          });
        }
      } catch {
        // handled by regex
      }
    }

    // If last_train is earlier than first_train, last_train_crosses_midnight must be true, and reverse.
    const [firstH, firstM] = sh.first_train.split(":").map(Number);
    const [lastH, lastM] = sh.last_train.split(":").map(Number);
    const firstMins = firstH * 60 + firstM;
    const lastMins = lastH * 60 + lastM;

    const earlier = lastMins < firstMins;
    if (earlier && !sh.last_train_crosses_midnight) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "last_train is earlier than first_train, so last_train_crosses_midnight must be true",
        path: ["last_train_crosses_midnight"],
      });
    } else if (!earlier && sh.last_train_crosses_midnight) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "last_train_crosses_midnight is true but last_train is not earlier than first_train",
        path: ["last_train_crosses_midnight"],
      });
    }
  });
export type ServiceHours = z.infer<typeof ServiceHoursSchema>;


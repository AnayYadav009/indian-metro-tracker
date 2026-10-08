import { z } from "zod";

export const StatusSchema = z.enum(["operational", "construction", "planned"]);
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
  retrieved_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD")
    .optional(),
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

    const isNonMock = data.source.toLowerCase() !== "mock";
    const isManual = data.source.toLowerCase().includes("manual");
    const isNotPureOsm = data.source.toLowerCase() !== "osm";
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
    last_verified: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD")
      .nullable(),
    retrieved_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD")
      .optional(),
    completion_unconfirmed: z.boolean().default(false).optional(),
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

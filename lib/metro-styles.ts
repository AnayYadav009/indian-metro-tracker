import type { Status, Layout } from "@/types/schema";

export type LineStrokeStyle = "solid" | "dashed" | "dotted";

export interface StatusMeta {
  id: Status;
  label: string;
  patternLabel: string;
  description: string;
  lineStyle: LineStrokeStyle;
  // Complete static Tailwind class strings (never constructed dynamically)
  badgeClass: string;
  textColorClass: string;
  borderColorClass: string;
  bgColorClass: string;
}

export const STATUS_DEFINITIONS: Record<Status, StatusMeta> = {
  operational: {
    id: "operational",
    label: "Operational",
    patternLabel: "Solid",
    description: "In-service lines",
    lineStyle: "solid",
    badgeClass: "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400",
    textColorClass: "text-emerald-400",
    borderColorClass: "border-emerald-500/30",
    bgColorClass: "bg-emerald-400",
  },
  construction: {
    id: "construction",
    label: "Under Construction",
    patternLabel: "Dashed",
    description: "Actively building",
    lineStyle: "dashed",
    badgeClass: "inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400",
    textColorClass: "text-amber-400",
    borderColorClass: "border-amber-500/30",
    bgColorClass: "bg-amber-400",
  },
  planned: {
    id: "planned",
    label: "Planned / Proposed",
    patternLabel: "Dotted",
    description: "Approved & DPRs",
    lineStyle: "dotted",
    badgeClass: "inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-400",
    textColorClass: "text-violet-400",
    borderColorClass: "border-violet-500/30",
    bgColorClass: "bg-violet-400",
  },
} as const;

export const STATUS_LIST: StatusMeta[] = [
  STATUS_DEFINITIONS.operational,
  STATUS_DEFINITIONS.construction,
  STATUS_DEFINITIONS.planned,
];

export interface LayoutMeta {
  label: string;
  badgeClass: string;
}

export const LAYOUT_DEFINITIONS: Record<Layout, LayoutMeta> = {
  underground: {
    label: "Underground",
    badgeClass: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  },
  elevated: {
    label: "Elevated",
    badgeClass: "border-teal-500/30 bg-teal-500/10 text-teal-400",
  },
  "at-grade": {
    label: "At-Grade",
    badgeClass: "border-slate-500/30 bg-slate-500/10 text-slate-400",
  },
} as const;

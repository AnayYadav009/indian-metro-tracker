import type { Status } from "@/types/schema";

const STATUS_LABELS: Record<Status, string> = {
  operational: "Operational",
  construction: "Under Construction",
  planned: "Planned",
};

export function getLineStatusLabels(statuses: readonly Status[]): string[] {
  return [...new Set(statuses)].map((status) => STATUS_LABELS[status]);
}
